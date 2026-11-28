import Link from "next/link";
import type { CSSProperties } from "react";
import AuthForm from "@/components/AuthForm";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DEPARTMENTS, EXERCISES } from "@/data/exercises";
import { NAV_ACCENTS, deptAccent, type Accent } from "@/lib/theme";
import {
  currentWeekFrom,
  enrollmentDetailHref,
  formatEnrolledDate,
  resolvePlanInput,
} from "@/lib/planTimetable";
import type { PlanInput } from "@/lib/planTimetable";
import type { EnrollmentRow } from "@/lib/plans";

/** Design-system accent vars for a card + its chip, from NAV_ACCENTS.
 *  Sets --card-accent / --card-soft (used by .card-accent) and
 *  --chip / --chip-soft (used by .chip-accent). */
function dsAccent(accent: Accent): CSSProperties {
  return {
    "--card-accent": accent.color,
    "--card-soft": accent.soft,
    "--chip": accent.color,
    "--chip-soft": accent.soft,
  } as CSSProperties;
}

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The user's real enrolments (own rows only) for the My Enrolled
  // Courses section. Signed-out users see the sign-in note instead.
  const myCourses: { row: EnrollmentRow; plan: PlanInput; week: number }[] =
    [];
  if (user) {
    const { data } = await supabase
      .from("enrollments")
      .select("id, user_id, plan_id, plan_title, custom_details, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    for (const row of (data ?? []) as EnrollmentRow[]) {
      const plan = resolvePlanInput(row);
      if (!plan) continue;
      myCourses.push({
        row,
        plan,
        week: currentWeekFrom(row.created_at, plan.weeks),
      });
    }
  }

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
        <div className="hero-cta">
          <Link href="/exercises" className="btn btn-primary">
            Browse Exercises
          </Link>
          <Link href="/timer" className="btn btn-secondary">
            Open the Timer
          </Link>
          <Link href="/teleprompter" className="btn btn-secondary">
            Open the Teleprompter
          </Link>
        </div>
        <div className="hero-stats">
          <div
            className="hstat card-accent"
            style={
              {
                "--hstat-accent": "#6ec1ff",
                "--hstat-soft": "rgba(110, 193, 255, 0.12)",
                "--card-accent": "#6ec1ff",
                "--card-soft": "rgba(110, 193, 255, 0.12)",
              } as CSSProperties
            }
          >
            <span className="hstat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 8v8M4 10v4M17 8v8M20 10v4M7 12h10" />
              </svg>
            </span>
            <b>{EXERCISES.length}</b>
            <span>Exercises</span>
          </div>
          <div
            className="hstat card-accent"
            style={
              {
                "--hstat-accent": "#b48cff",
                "--hstat-soft": "rgba(180, 140, 255, 0.12)",
                "--card-accent": "#b48cff",
                "--card-soft": "rgba(180, 140, 255, 0.12)",
              } as CSSProperties
            }
          >
            <span className="hstat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="7" height="7" rx="1.5" />
                <rect x="13" y="4" width="7" height="7" rx="1.5" />
                <rect x="4" y="13" width="7" height="7" rx="1.5" />
                <rect x="13" y="13" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <b>{DEPARTMENTS.length}</b>
            <span>Departments</span>
          </div>
          <div
            className="hstat card-accent"
            style={
              {
                "--hstat-accent": "#4dd8c4",
                "--hstat-soft": "rgba(77, 216, 196, 0.12)",
                "--card-accent": "#4dd8c4",
                "--card-soft": "rgba(77, 216, 196, 0.12)",
              } as CSSProperties
            }
          >
            <span className="hstat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 2.5h8L19.5 8v13.5H6Z" />
                <path d="M13.5 2.5V8H19.5M9 12.5h6M9 16h6" />
              </svg>
            </span>
            <b>14</b>
            <span>Monologues</span>
          </div>
        </div>
      </section>

      <section className="section" data-page="dashboard">
        <div className="page-head">
          <h2>My Enrolled Courses</h2>
          <span className="accent-bar" aria-hidden="true"></span>
          <p className="sub">
            The plans you enrolled in — open one to see its week-by-week
            timetable. All plans are free — Rs 0.
          </p>
        </div>
        {!user && (
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.plans)}>
            <h3>Sign in to see your enrolled courses</h3>
            <p>
              Your enrolled plans and their timetables live here once you
              sign in.
            </p>
            <div className="rowbtns">
              <Link href="/#signin" className="btn btn-secondary">
                Sign in
              </Link>
              <Link href="/plans" className="btn btn-secondary">
                Browse plans
              </Link>
            </div>
          </div>
        )}
        {user && myCourses.length === 0 && (
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.plans)}>
            <h3>No enrolled courses yet</h3>
            <p>
              You have not enrolled in any plan yet. Pick a plan and enrol
              free — its week-by-week timetable will appear here.
            </p>
            <div className="rowbtns">
              <Link href="/plans" className="btn btn-primary">
                Browse plans
              </Link>
            </div>
          </div>
        )}
        {user && myCourses.length > 0 && (
          <div className="grid">
            {myCourses.map(({ row, plan, week }) => {
              const accent = deptAccent(plan.department);
              return (
                <div
                  key={row.id}
                  className="card card-accent"
                  style={
                    {
                      "--card-accent": accent.color,
                      "--card-soft": accent.soft,
                      display: "flex",
                      flexDirection: "column",
                    } as CSSProperties
                  }
                >
                  <span
                    className="chip"
                    style={
                      {
                        "--dept": accent.color,
                        "--dept-soft": accent.soft,
                      } as CSSProperties
                    }
                  >
                    {plan.department} · {plan.weeks} weeks
                  </span>
                  <h3>{plan.title}</h3>
                  <p>{plan.description}</p>
                  <p style={{ marginTop: 0, marginBottom: 0 }}>
                    <strong>
                      Week {week} of {plan.weeks}
                    </strong>{" "}
                    <span className="muted">
                      · enrolled {formatEnrolledDate(row.created_at)}
                    </span>
                  </p>
                  <div
                    className="rowbtns"
                    style={{ marginTop: "auto", paddingTop: 14 }}
                  >
                    <Link
                      href={enrollmentDetailHref(row)}
                      className="btn btn-gold"
                    >
                      Open plan
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section" data-page="dashboard">
        <div className="page-head">
          <h2>Why ACTORVERSE?</h2>
          <span className="accent-bar" aria-hidden="true"></span>
          <p className="sub">
            One app for the whole craft — practice, record, track and find
            work, without paying for five different tools.
          </p>
        </div>
        <div className="why-grid">
          <Link
            href="/exercises"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.exercises)}
          >
            <span className="why-num">1</span>
            <h3>Train every skill</h3>
            <p>
              170 exercises across 10 departments — voice, body, emotion,
              camera craft and more, each with a built-in timer.
            </p>
          </Link>
          <Link
            href="/teleprompter"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.teleprompter)}
          >
            <span className="why-num">2</span>
            <h3>Record with the Teleprompter</h3>
            <p>
              Your script scrolls while the camera records — with Wide,
              Medium and Close-up framing, so the take looks right.
            </p>
          </Link>
          <Link
            href="/scripts"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.scripts)}
          >
            <span className="why-num">3</span>
            <h3>Your private Script Vault</h3>
            <p>
              Your PDF scripts live in your own private vault — upload, view
              and send the text straight to the Teleprompter.
            </p>
          </Link>
          <Link
            href="/monologues"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.monologues)}
          >
            <span className="why-num">4</span>
            <h3>14 original monologues</h3>
            <p>
              Fourteen monologues written for this app. Read one, practise
              it, and send it to the Teleprompter in one tap.
            </p>
          </Link>
          <Link
            href="/plans"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.plans)}
          >
            <span className="why-num">5</span>
            <h3>7 training plans</h3>
            <p>
              Follow a guided plan or build your own — pick a department,
              minutes a day and weeks, and enrol free.
            </p>
          </Link>
          <Link
            href="/coach"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.coach)}
          >
            <span className="why-num">6</span>
            <h3>AI Coach</h3>
            <p>
              Your acting coach in English or Urdu — one practical exercise
              at a time, based on what you ask.
            </p>
          </Link>
          <Link
            href="/analytics"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.analytics)}
          >
            <span className="why-num">7</span>
            <h3>See your progress</h3>
            <p>
              Analytics, weekly goals and badges earned from your real
              practice — minutes, sessions and streaks, nothing faked.
            </p>
          </Link>
          <Link
            href="/community"
            className="card why-card card-accent"
            style={dsAccent(NAV_ACCENTS.community)}
          >
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

      <section className="section" data-page="dashboard">
        <div className="page-head">
          <h2>
            {user ? "Welcome back. Ready to train today?" : "Start training today"}
          </h2>
          <span className="accent-bar" aria-hidden="true"></span>
          <p className="sub">
            Pick a tool and start. Sign in to save your sessions and track your
            progress — without an account, everything still works, it just does
            not save.
          </p>
        </div>
        <div className="grid">
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.exercises)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.exercises)}>Daily work</span>
            <h3>Exercise Library</h3>
            <p>
              170 exercises across 10 departments — voice, body, emotion,
              camera craft and more, each with a built-in timer.
            </p>
            <div className="rowbtns">
              <Link href="/exercises" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.timer)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.timer)}>Practice</span>
            <h3>My Timer</h3>
            <p>
              Simple practice timer with presets. Pick a time, press Start —
              when it finishes, it saves by itself.
            </p>
            <div className="rowbtns">
              <Link href="/timer" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.teleprompter)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.teleprompter)}>Record</span>
            <h3>Teleprompter</h3>
            <p>
              Pick a monologue or paste your own text, then record while the
              script scrolls — with Wide, Medium and Close-up framing.
            </p>
            <div className="rowbtns">
              <Link href="/teleprompter" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.studio)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.studio)}>Record</span>
            <h3>Studio</h3>
            <p>
              Camera Studio to record takes, plus My Private Recordings —
              your saved takes, each with Play, Save to phone and Delete.
            </p>
            <div className="rowbtns">
              <Link href="/studio" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.analytics)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.analytics)}>Progress</span>
            <h3>Analytics</h3>
            <p>
              Your practice minutes, streak, weekly goal and progress by
              department — all in one place.
            </p>
            <div className="rowbtns">
              <Link href="/analytics" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.scripts)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.scripts)}>Scripts</span>
            <h3>Script Vault</h3>
            <p>
              Your private PDF scripts — upload, view, rename and send the
              text to the Teleprompter.
            </p>
            <div className="rowbtns">
              <Link href="/scripts" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.monologues)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.monologues)}>Practise</span>
            <h3>Monologues</h3>
            <p>
              14 original monologues to read and perform. Send any of them
              straight to the Teleprompter.
            </p>
            <div className="rowbtns">
              <Link href="/monologues" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.plans)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.plans)}>Follow a plan</span>
            <h3>Training Plans</h3>
            <p>
              7 guided plans plus your own custom plan. Enrol free — Rs 0.
            </p>
            <div className="rowbtns">
              <Link href="/plans" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.coach)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.coach)}>Ask</span>
            <h3>AI Coach</h3>
            <p>
              Your acting coach in English or Urdu. Simple answers, one
              practical exercise at a time.
            </p>
            <div className="rowbtns">
              <Link href="/coach" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.achievements)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.achievements)}>Progress</span>
            <h3>Achievements</h3>
            <p>
              Badges earned from your real practice — minutes, sessions and
              streaks. Nothing faked.
            </p>
            <div className="rowbtns">
              <Link href="/achievements" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.community)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.community)}>People</span>
            <h3>Community</h3>
            <p>
              Actors helping actors. Share a win, a question, or a tip.
            </p>
            <div className="rowbtns">
              <Link href="/community" className="btn btn-secondary">
                Open
              </Link>
            </div>
          </div>
          <div className="card card-accent" style={dsAccent(NAV_ACCENTS.auditions)}>
            <span className="chip chip-accent" style={dsAccent(NAV_ACCENTS.auditions)}>Work</span>
            <h3>Audition Center</h3>
            <p>
              Find auditions or post one of your own — and apply in a few
              taps.
            </p>
            <div className="rowbtns">
              <Link href="/auditions" className="btn btn-secondary">
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
          <div className="page-head" style={{ textAlign: "center" }}>
            <span
              className="accent-bar"
              aria-hidden="true"
              style={{ margin: "0 auto" }}
            ></span>
          </div>
          <AuthForm />
        </section>
      )}
    </>
  );
}
