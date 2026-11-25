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
            <b>14</b>
            <span>Monologues</span>
          </div>
        </div>
        <div className="hero-cta">
          <Link href="/exercises" className="btn btn-gold">
            Browse Exercises
          </Link>
          <Link href="/timer" className="btn btn-ghost">
            Open the Timer
          </Link>
          <Link href="/teleprompter" className="btn btn-ghost">
            Open the Teleprompter
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>Why ACTORVERSE?</h2>
        <p className="sub">
          One app for the whole craft — practice, record, track and find
          work, without paying for five different tools.
        </p>
        <div className="why-grid">
          <Link href="/exercises" className="card why-card">
            <span className="why-num">1</span>
            <h3>Train every skill</h3>
            <p>
              170 exercises across 10 departments — voice, body, emotion,
              camera craft and more, each with a built-in timer.
            </p>
          </Link>
          <Link href="/teleprompter" className="card why-card">
            <span className="why-num">2</span>
            <h3>Record with the Teleprompter</h3>
            <p>
              Your script scrolls while the camera records — with Wide,
              Medium and Close-up framing, so the take looks right.
            </p>
          </Link>
          <Link href="/scripts" className="card why-card">
            <span className="why-num">3</span>
            <h3>Your private Script Vault</h3>
            <p>
              Your PDF scripts live in your own private vault — upload, view
              and send the text straight to the Teleprompter.
            </p>
          </Link>
          <Link href="/monologues" className="card why-card">
            <span className="why-num">4</span>
            <h3>14 original monologues</h3>
            <p>
              Fourteen monologues written for this app. Read one, practise
              it, and send it to the Teleprompter in one tap.
            </p>
          </Link>
          <Link href="/plans" className="card why-card">
            <span className="why-num">5</span>
            <h3>7 training plans</h3>
            <p>
              Follow a guided plan or build your own — pick a department,
              minutes a day and weeks, and enrol free.
            </p>
          </Link>
          <Link href="/coach" className="card why-card">
            <span className="why-num">6</span>
            <h3>AI Coach</h3>
            <p>
              Your acting coach in English or Urdu — one practical exercise
              at a time, based on what you ask.
            </p>
          </Link>
          <Link href="/analytics" className="card why-card">
            <span className="why-num">7</span>
            <h3>See your progress</h3>
            <p>
              Analytics, weekly goals and badges earned from your real
              practice — minutes, sessions and streaks, nothing faked.
            </p>
          </Link>
          <Link href="/community" className="card why-card">
            <span className="why-num">8</span>
            <h3>Actors helping actors</h3>
            <p>
              Share wins and questions in the Community, and find or post
              auditions in the Audition Center.
            </p>
          </Link>
        </div>
        <div className="note">
          <strong>Everything is free right now — Rs 0.</strong> No trial, no
          card, no paywall. Every feature above is included.
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
            <span className="chip">Record</span>
            <h3>Teleprompter</h3>
            <p>
              Pick a monologue or paste your own text, then record while the
              script scrolls — with Wide, Medium and Close-up framing.
            </p>
            <div className="rowbtns">
              <Link href="/teleprompter" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Record</span>
            <h3>Studio</h3>
            <p>
              Camera Studio to record takes, plus My Private Recordings —
              your saved takes, each with Play, Save to phone and Delete.
            </p>
            <div className="rowbtns">
              <Link href="/studio" className="btn btn-dark">
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
          <div className="card">
            <span className="chip">Scripts</span>
            <h3>Script Vault</h3>
            <p>
              Your private PDF scripts — upload, view, rename and send the
              text to the Teleprompter.
            </p>
            <div className="rowbtns">
              <Link href="/scripts" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Practise</span>
            <h3>Monologues</h3>
            <p>
              14 original monologues to read and perform. Send any of them
              straight to the Teleprompter.
            </p>
            <div className="rowbtns">
              <Link href="/monologues" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Follow a plan</span>
            <h3>Training Plans</h3>
            <p>
              7 guided plans plus your own custom plan. Enrol free — Rs 0.
            </p>
            <div className="rowbtns">
              <Link href="/plans" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Ask</span>
            <h3>AI Coach</h3>
            <p>
              Your acting coach in English or Urdu. Simple answers, one
              practical exercise at a time.
            </p>
            <div className="rowbtns">
              <Link href="/coach" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Progress</span>
            <h3>Achievements</h3>
            <p>
              Badges earned from your real practice — minutes, sessions and
              streaks. Nothing faked.
            </p>
            <div className="rowbtns">
              <Link href="/achievements" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">People</span>
            <h3>Community</h3>
            <p>
              Actors helping actors. Share a win, a question, or a tip.
            </p>
            <div className="rowbtns">
              <Link href="/community" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
          <div className="card">
            <span className="chip">Work</span>
            <h3>Audition Center</h3>
            <p>
              Find auditions or post one of your own — and apply in a few
              taps.
            </p>
            <div className="rowbtns">
              <Link href="/auditions" className="btn btn-dark">
                Open
              </Link>
            </div>
          </div>
        </div>
        <div className="note">
          <strong>Everything is free right now (Rs 0):</strong> Script Vault,
          Monologues, Training Plans, AI Coach, Achievements, Community and
          Audition Center are all in. The Admin Panel is under{" "}
          <Link href="/admin">Admin</Link> — the owner claims the first Super
          Admin seat there.
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
