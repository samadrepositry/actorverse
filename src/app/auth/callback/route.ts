import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase-shared";

/**
 * Handles Supabase email links (sign-up confirmation and password reset).
 *
 * Supabase sends a PKCE `?code=` (or a legacy `?token_hash=`) to this route.
 * We exchange it for a session and send the user to the Dashboard — or, for
 * a password-recovery link, to the page where they set a new password.
 * The redirect target is always the live site (the request origin), never
 * localhost.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const isRecovery = type === "recovery";
  const next = isRecovery ? "/auth/reset-password" : "/";

  if (code || tokenHash) {
    const cookieStore = cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll can throw inside a Route Handler when the response is
            // already being built; the redirect below still carries the
            // session cookies set above.
          }
        },
      },
    });

    let ok = false;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    } else if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: (type as "email" | "recovery" | "signup") || "email",
      });
      ok = !error;
    }

    if (ok) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // No code, or the exchange failed (expired/used link): send the user to
  // the home page with a plain message instead of a dead page.
  return NextResponse.redirect(new URL("/?auth=link-error", url.origin));
}
