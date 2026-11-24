"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setMessage(
          "Account created. Check your email to confirm, then sign in.",
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

  return (
    <div className="card" id="signin">
      <h3>{mode === "signin" ? "Sign in" : "Create your account"}</h3>
      <p>
        {mode === "signin"
          ? "Sign in to save your practice sessions and see your progress."
          : "Create a free account to save your practice sessions and track your progress."}
      </p>
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
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" className="btn btn-gold" disabled={busy || !configured}>
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
      <div className="rowbtns">
        <button
          type="button"
          className="btn btn-line"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "signin"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
