// ACTORVERSE — My Enrolled Courses
// The one obvious place for every plan the user enrolled in: each card
// shows the current week (counted from the real enrolment date) and
// opens the plan's week-by-week timetable. Signed-out users see an
// honest empty state — never fake enrolments. Free — Rs 0.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { deptAccent } from "@/lib/theme";
import {
  listMyEnrollments,
  unenrol,
} from "@/lib/plans";
import type { EnrollmentRow } from "@/lib/plans";
import {
  currentWeekFrom,
  enrollmentDetailHref,
  formatEnrolledDate,
  resolvePlanInput,
} from "@/lib/planTimetable";
import { showToast } from "@/components/Toast";

export default function MyPlansPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const refreshList = useCallback(async () => {
    setEnrollments(await listMyEnrollments());
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
          await refreshList();
        }
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshList]);

  async function handleLeave(row: EnrollmentRow) {
    setBusyId(row.id);
    const error = await unenrol(row.id);
    setBusyId(null);
    if (error) {
      setMessageOk(false);
      setMessage(error);
      return;
    }
    setMessageOk(true);
    setMessage("Left the plan.");
    showToast("Left the plan.");
    void refreshList();
  }

  return (
    <section className="section" data-page="plans">
      <div className="page-head">
        <span className="eyebrow">Your training</span>
        <h1>My Enrolled Courses</h1>
        <span className="accent-bar" aria-hidden="true"></span>
        <p>
          The plans you enrolled in — open one to see its week-by-week
          timetable. All plans are free — Rs 0.
        </p>
      </div>

      {signedIn === false && (
        <p className="note">
          Sign in to see your enrolled courses. You can browse every plan
          without an account.
        </p>
      )}

      {signedIn === true && enrollments.length === 0 && (
        <div className="card card-flat">
          <h3 style={{ marginTop: 0 }}>No enrolled courses yet</h3>
          <p className="sub">
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

      {signedIn === true && enrollments.length > 0 && (
        <div className="grid">
          {enrollments.map((row) => {
            const plan = resolvePlanInput(row);
            if (!plan) return null;
            const week = currentWeekFrom(row.created_at, plan.weeks);
            const accent = deptAccent(plan.department);
            return (
              <article
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
                <div className="meta">
                  <span>{plan.level}</span>
                  <span>{plan.minutesPerDay} min/day</span>
                  <span>Free — Rs 0</span>
                </div>
                <p style={{ marginTop: 10, marginBottom: 0 }}>
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
                  <button
                    type="button"
                    className="btn btn-line"
                    disabled={busyId === row.id}
                    onClick={() => void handleLeave(row)}
                  >
                    Leave plan
                  </button>
                </div>
              </article>
            );
          })}
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
