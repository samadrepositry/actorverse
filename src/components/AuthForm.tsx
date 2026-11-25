"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { APP_URL } from "@/lib/supabase-shared";

type Mode = "signin" | "signup" | "forgot";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  const configured = isSupabaseConfigured();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setAlreadyRegistered(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setAlreadyRegistered(false);
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            // Email links must come back to the live site, never localhost.
            emailRedirectTo: `${APP_URL}/auth/callback`,
          },
        });
        if (error) throw error;
        // Supabase returns a user with no identities when the email is
        // already registered — no error is raised, so check it ourselves.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setAlreadyRegistered(true);
          setError(
            "This email is already registered. Please sign in, or reset your password.",
          );
          return;
        }
        setMessage(
          "Account created. Check your email and tap the confirmation link — it will bring you straight back here, signed in.",
        );
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${APP_URL}/auth/callback`,
        });
        if (error) throw error;
        setMessage(
          "Check your inbox — we sent a password reset link. Tap it and choose a new password.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Signed in. Welcome back.");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";
  const intro =
    mode === "signin"
      ? "Sign in to save your practice sessions and see your progress."
      : mode === "signup"
        ? "Create a free account to save your practice sessions and track your progress."
        : "Enter your email and we will send you a link to choose a new password.";

  return (
    <div className="card" id="signin">
      <h3>{title}</h3>
      <p>{intro}</p>
      {!configured && (
        <p className="note" style={{ marginTop: 12 }}>
          Supabase is not set up yet. Ask the app owner to add the Supabase
          URL and anon key to <code>.env.local</code> (see{" "}
          <code>.env.example</code>).
        </p>
      )}
      <form className="form" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        {mode === "signup" && (
          <div>
            <label htmlFor="full-name">Full name</label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        {mode !== "forgot" && (
          <div>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" className="btn btn-gold" disabled={busy || !configured}>
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>
      {mode === "signin" && (
        <div className="rowbtns">
          <button
            type="button"
            className="btn btn-line"
            onClick={() => switchMode("forgot")}
          >
            Forgot password?
          </button>
        </div>
      )}
      {alreadyRegistered && (
        <div className="rowbtns">
          <button
            type="button"
            className="btn btn-line"
            onClick={() => switchMode("forgot")}
          >
            Reset password
          </button>
          <button
            type="button"
            className="btn btn-line"
            onClick={() => switchMode("signin")}
          >
            Sign in instead
          </button>
        </div>
      )}
      <div className="rowbtns">
        <button
          type="button"
          className="btn btn-line"
          onClick={() =>
            switchMode(mode === "signin" ? "signup" : "signin")
          }
        >
          {mode === "signin"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
