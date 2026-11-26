// ACTORVERSE — Achievements (Phase 4)
// Badges earned from REAL practice data only: minutes, sessions, streak
// and departments practised. Nothing is faked — an unearned badge simply
// shows its progress.

import Link from "next/link";
import type { CSSProperties } from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-shared";
import { computeAchievements } from "@/lib/achievements";
import type { SessionRow } from "@/lib/achievements";

export default async function AchievementsPage() {
  let sessions: SessionRow[] = [];
  let signedIn = false;
  let configured = isSupabaseConfigured();

  if (configured) {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      const { data } = await supabase
        .from("sessions")
        .select("id, exercise_title, department, kind, minutes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      sessions = (data ?? []) as SessionRow[];
    }
  }

  const summary = computeAchievements(sessions);
  const earned = summary.badges.filter((b) => b.earned).length;

  return (
    <section className="section" data-page="achievements">
      <div className="page-head">
        <span className="eyebrow">Progress</span>
        <h1>Achievements</h1>
        <span className="accent-bar" aria-hidden="true" />
        <p>
          Badges you earn by actually training. No shortcuts — practise, and
          they unlock.
        </p>
      </div>

      {!configured && (
        <p className="note">
          Sign-in is not set up yet, so progress cannot be saved or shown.
        </p>
      )}

      {configured && !signedIn && (
        <p className="note">
          <Link href="/#signin">Sign in</Link> to see your achievements.
          Your badges are computed from your real practice sessions.
        </p>
      )}

      {signedIn && (
        <>
          <div className="hero-stats" style={{ justifyContent: "flex-start" }}>
            <div
              className="hstat"
              style={
                {
                  "--hstat-accent": "#ff8fd1",
                  "--hstat-soft": "rgba(255, 143, 209, 0.12)",
                } as CSSProperties
              }
            >
              <b>{earned}</b>
              <span>Badges earned</span>
            </div>
            <div
              className="hstat"
              style={
                {
                  "--hstat-accent": "#ff8fd1",
                  "--hstat-soft": "rgba(255, 143, 209, 0.12)",
                } as CSSProperties
              }
            >
              <b>{summary.totalSessions}</b>
              <span>Sessions</span>
            </div>
            <div
              className="hstat"
              style={
                {
                  "--hstat-accent": "#ff8fd1",
                  "--hstat-soft": "rgba(255, 143, 209, 0.12)",
                } as CSSProperties
              }
            >
              <b>{summary.totalMinutes}</b>
              <span>Minutes</span>
            </div>
            <div
              className="hstat"
              style={
                {
                  "--hstat-accent": "#ff8fd1",
                  "--hstat-soft": "rgba(255, 143, 209, 0.12)",
                } as CSSProperties
              }
            >
              <b>{summary.streak}</b>
              <span>Day streak</span>
            </div>
          </div>

          <div className="badge-grid">
            {summary.badges.map((badge) => (
              <div
                key={badge.id}
                className={`badge ${badge.earned ? "badge-earned" : "badge-locked"}`}
              >
                <span className="badge-icon" aria-hidden="true">
                  {badge.earned ? "★" : "☆"}
                </span>
                <h3>{badge.title}</h3>
                <p>{badge.description}</p>
                <p className="badge-progress">{badge.progress}</p>
              </div>
            ))}
          </div>

          {summary.totalSessions === 0 && (
            <p className="note">
              No sessions yet. Finish one practice session in the{" "}
              <Link href="/timer">Timer</Link> and your first badge will
              unlock.
            </p>
          )}
        </>
      )}
    </section>
  );
}
