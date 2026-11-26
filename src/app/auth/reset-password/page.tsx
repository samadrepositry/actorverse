"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Your password is updated. You are signed in — welcome back.");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Try the reset link again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="page-head" style={{ paddingTop: 0 }}>
        <h2>Set a new password</h2>
        <span className="accent-bar" aria-hidden="true" />
        <p className="sub">
          You came here from your password reset email. Choose a new password
          below.
        </p>
      </div>
      <div className="card card-accent">
        <form className="form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="new-password" className="field-label">New password</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              className="field"
              style={{ minHeight: 44 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="field-label">Type it again</label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              className="field"
              style={{ minHeight: 44 }}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the new password"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {message && <p className="success" role="status">{message}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !configured}
            style={{ width: "100%" }}
          >
            {busy ? "Please wait…" : "Save new password"}
          </button>
        </form>
        {message && (
          <div className="rowbtns">
            <Link href="/" className="btn btn-secondary" style={{ flex: "1 1 auto" }}>
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
