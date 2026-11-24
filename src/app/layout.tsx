import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "ACTORVERSE — Train Like an Athlete. Perform Like a Legend.",
  description:
    "A complete training ground for actors — voice, body, camera and auditions — in one app. 170 exercises across 10 departments.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand">
              ACTORVERSE
            </Link>
            <nav className="nav" aria-label="Main">
              <Link href="/exercises">Exercises</Link>
              <Link href="/timer">Timer</Link>
              <Link href="/analytics">Analytics</Link>
              {user ? (
                <SignOutButton />
              ) : (
                <Link href="/#signin">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer>
          ACTORVERSE — Train Like an Athlete. Perform Like a Legend.
        </footer>
      </body>
    </html>
  );
}
