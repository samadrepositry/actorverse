// ACTORVERSE — Plan detail view (My Enrolled Courses)
// One enrolled plan, opened: its week-by-week timetable (Monday–
// Friday, specific exercises with Start-with-timer links), the week's
// theme and what the actor will be able to do by the end of each week
// and by the end of the plan. The current week comes from the real
// enrolment date; a day is marked done ONLY when a real practice
// session was saved for it. Nothing is faked.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { PLANS } from "@/data/plans";
import { deptAccent } from "@/lib/theme";
import {
  enrolPlan,
  listMyEnrollments,
  unenrol,
} from "@/lib/plans";
import type { EnrollmentRow } from "@/lib/plans";
import { listMySessions } from "@/lib/achievements";
import type { SessionRow } from "@/lib/achievements";
import {
  buildTimetable,
  builtinPlanInput,
  currentWeekFrom,
  formatDayDate,
  formatEnrolledDate,
  isDayDone,
  resolvePlanInput,
  timerLink,
  weekDates,
} from "@/lib/planTimetable";
import type { PlanInput } from "@/lib/planTimetable";
import { showToast } from "@/components/Toast";

export default function PlanDetailView({
  planId,
  enrollmentId,
}: {
  planId: string;
  enrollmentId?: string;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const loadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    setEnrollments(await listMyEnrollments());
    setSessions(await listMySessions());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setSignedIn(false);
        return;
      }
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setSignedIn(Boolean(user));
        if (user && !loadedOnce.current) {
          loadedOnce.current = true;
          await refresh();
        }
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Resolve the plan: a built-in plan by id, or a custom plan by its
  // enrolment row.
  let plan: PlanInput | null = null;
  let enrollment: EnrollmentRow | null = null;
  if (planId === "custom") {
    enrollment = enrollments.find((e) => e.id === enrollmentId) ?? null;
    if (enrollment) plan = resolvePlanInput(enrollment);
  } else {
    const found = PLANS.find((p) => p.id === planId);
    if (found) {
      plan = builtinPlanInput(found);
      enrollment =
        enrollments.find((e) => e.plan_id === planId) ?? null;
    }
  }

  if (!plan) {
    return (
      <section className="section" data-page="plans">
        <div className="page-head">
          <span className="eyebrow">Your training plan</span>
          <h1>Plan not found</h1>
          <span className="accent-bar" aria-hidden="true"></span>
          <p>This plan does not exist, or you are not enrolled in it.</p>
        </div>
        <div className="rowbtns">
          <Link href="/plans" className="btn btn-primary">
            Browse plans
          </Link>
          <Link href="/my-plans" className="btn btn-secondary">
            My enrolled courses
          </Link>
        </div>
      </section>
    );
  }

  const timetable = buildTimetable(plan);
  const currentWeek = enrollment
    ? currentWeekFrom(enrollment.created_at, plan.weeks)
    : 1;
  const anchorDate = enrollment
    ? enrollment.created_at
    : new Date().toISOString();
  const accent = deptAccent(plan.department);

  async function handleEnrol() {
    const found = PLANS.find((p) => p.id === planId);
    if (!found) return;
    setBusy(true);
    const result = await enrolPlan(found);
    setBusy(false);
    setMessageOk(result.ok);
    setMessage(result.message);
    if (result.ok) {
      showToast("Enrolled — free.");
      void refresh();
    }
  }

  async function handleLeave() {
    if (!enrollment) return;
    setBusy(true);
    const error = await unenrol(enrollment.id);
    setBusy(false);
    if (error) {
      setMessageOk(false);
      setMessage(error);
      return;
    }
    setMessageOk(true);
    setMessage("Left the plan.");
    showToast("Left the plan.");
    void refresh();
  }

  return (
    <section className="section" data-page="plans">
      <div className="page-head">
        <span className="eyebrow">Your training plan</span>
        <h1>{plan.title}</h1>
        <span className="accent-bar" aria-hidden="true"></span>
        <p>{plan.description}</p>
      </div>

      <div className="meta" style={{ marginBottom: 12 }}>
        <span>{plan.department}</span>
        <span>{plan.weeks} weeks</span>
        <span>{plan.level}</span>
        <span>{plan.minutesPerDay} min/day</span>
        <span>Free — Rs 0</span>
      </div>

      <div className="card card-gold" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>What this plan gives you</h3>
        <p style={{ marginBottom: 0 }}>
          By the end of this plan you will be able to {timetable.planOutcome}
        </p>
      </div>

      {enrollment ? (
        <p className="note">
          Enrolled ✓ since {formatEnrolledDate(enrollment.created_at)} — you
          are on <strong>Week {currentWeek} of {plan.weeks}</strong>.
        </p>
      ) : signedIn === false ? (
        <p className="note">
          Sign in to enrol in this plan. You can read the full timetable
          below without an account.
        </p>
      ) : (
        <div className="rowbtns" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-gold"
            disabled={busy}
            onClick={() => void handleEnrol()}
          >
            {busy ? "Enrolling…" : "Enrol — free"}
          </button>
        </div>
      )}

      <div className="rowbtns" style={{ marginBottom: 16 }}>
        {timetable.weeks.map((w) => (
          <a
            key={w.week}
            href={`#week-${w.week}`}
            className="btn btn-line"
            style={
              enrollment !== null && w.week === currentWeek
                ? { borderColor: "var(--gold)", color: "var(--gold)" }
                : undefined
            }
          >
            Week {w.week}
            {enrollment !== null && w.week === currentWeek ? " · This week" : ""}
          </a>
        ))}
      </div>

      {timetable.weeks.map((week) => {
        const dates = weekDates(anchorDate, week.week - 1);
        const isCurrent = enrollment !== null && week.week === currentWeek;
        return (
          <article
            key={week.week}
            id={`week-${week.week}`}
            className={"card " + (isCurrent ? "card-gold" : "card-accent")}
            style={
              {
                "--card-accent": accent.color,
                "--card-soft": accent.soft,
                marginBottom: 16,
                scrollMarginTop: 84,
              } as CSSProperties
            }
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0 }}>
                Week {week.week} — {week.theme}
              </h3>
              {isCurrent && <span className="chip">This week</span>}
            </div>
            <p className="sub" style={{ marginTop: 8 }}>
              By the end of this week you will be able to {week.outcome}
            </p>
            <ul className="session-list">
              {week.days.map((day, d) => {
                const date = dates[d];
                const done = isDayDone(date, day.exercises, sessions);
                return (
                  <li key={day.dayIndex} style={{ display: "block" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>
                        {day.label} · {formatDayDate(date)}
                      </strong>
                      <span className="muted">
                        {done ? "✓ Done" : `≈${day.totalMinutes} min`}
                      </span>
                    </div>
                    <p className="muted" style={{ margin: "4px 0 8px" }}>
                      Builds: {day.purpose}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                      {day.exercises.map((ex) => (
                        <li key={ex.id}>
                          {ex.title}{" "}
                          <span className="muted">
                            ({ex.minutes} min · {ex.level})
                          </span>{" "}
                          <Link
                            href={timerLink(ex)}
                            className="btn btn-line"
                            style={{ marginLeft: 6, minHeight: 32, padding: "2px 10px" }}
                          >
                            Start with timer
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}

      <p className="note">
        ✓ marks come from your real saved sessions — finish a timer session
        to earn one. Days are Monday to Friday, 5 days a week.
      </p>

      {enrollment && (
        <div className="rowbtns">
          <button
            type="button"
            className="btn btn-line"
            disabled={busy}
            onClick={() => void handleLeave()}
          >
            Leave plan
          </button>
          <Link href="/my-plans" className="btn btn-secondary">
            My enrolled courses
          </Link>
        </div>
      )}

      {message && (
        <p className={messageOk ? "success" : "error"} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
