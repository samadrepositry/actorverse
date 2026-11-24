import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DEPARTMENTS, EXERCISES } from "@/data/exercises";

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <section className="hero">
        <div className="brand" style={{ fontSize: "0.8rem" }}>
          A C T O R V E R S E
        </div>
        <h1>
          Train Like an Athlete.
          <br />
          <em>Perform Like a Legend.</em>
        </h1>
        <p className="tagline">
          A complete training ground for actors — voice, body, camera and
          auditions — in one app.
        </p>
        <div className="hero-stats">
          <div className="hstat">
            <b>{EXERCISES.length}</b>
            <span>Exercises</span>
          </div>
          <div className="hstat">
            <b>{DEPARTMENTS.length}</b>
            <span>Departments</span>
          </div>
          <div className="hstat">
            <b>10</b>
            <span>Departments</span>
          </div>
        </div>
        <div className="hero-cta">
          <Link href="/exercises" className="btn btn-gold">
            Browse Exercises
          </Link>
          <Link href="/timer" className="btn btn-ghost">
            Open the Timer
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>
          {user ? "Welcome back. Ready to train today?" : "Start training today"}
        </h2>
        <p className="sub">
          Pick a tool and start. Sign in to save your sessions and track your
          progress — without an account, everything still works, it just does
          not save.
        </p>
        <div className="grid">
          <div className="card">
            <span className="chip">Daily work</span>
            <h3>Exercise Library</h3>
            <p>
              170 exercises across 10 departments — voice, body, emotion,
              camera craft and more, each with a built-in timer.
            </p>
            <div className="rowbtns">
              <Link href="/exercises" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Practice</span>
            <h3>My Timer</h3>
            <p>
              Simple practice timer with presets. Pick a time, press Start —
              when it finishes, it saves by itself.
            </p>
            <div className="rowbtns">
              <Link href="/timer" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Progress</span>
            <h3>Analytics</h3>
            <p>
              Your practice minutes, streak, weekly goal and progress by
              department — all in one place.
            </p>
            <div className="rowbtns">
              <Link href="/analytics" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
        </div>
        <div className="note">
          <strong>Phase 1:</strong> exercise library, practice timer, and
          analytics with sign-in. Recording, Script Vault, Admin Panel, AI
          Coach and payments are not part of this phase.
        </div>
      </section>

      {!user && (
        <section className="section" style={{ maxWidth: 560, margin: "0 auto" }}>
          <AuthForm />
        </section>
      )}
    </>
  );
}
