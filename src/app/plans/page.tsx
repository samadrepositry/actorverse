// ACTORVERSE — Training Plans (Phase 3)
// 7 built-in plans plus a custom plan builder. Enrolling is free —
// Free Mode is on, so every plan costs Rs 0.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { PLANS } from "@/data/plans";
import { DEPARTMENTS } from "@/data/exercises";
import type { Department } from "@/data/exercises";
import { deptAccent } from "@/lib/theme";
import {
  enrolCustomPlan,
  enrolPlan,
  listMyEnrollments,
  unenrol,
} from "@/lib/plans";
import type { EnrollmentRow } from "@/lib/plans";
import { showToast } from "@/components/Toast";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function describeCustom(row: EnrollmentRow): string {
  if (!row.custom_details) return "";
  try {
    const d = JSON.parse(row.custom_details) as {
      department?: string;
      minutesPerDay?: number;
      weeks?: number;
    };
    // Non-breaking spaces keep each part ("20 min/day", "4 weeks")
    // whole — the line may only break at the "·" separators.
    const dept = (d.department ?? "").replace(/ /g, " ");
    return `${dept} · ${d.minutesPerDay ?? "?"} min/day · ${d.weeks ?? "?"} weeks`;
  } catch {
    return "";
  }
}

export default function PlansPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDepartment, setCustomDepartment] = useState<
    Department | "All departments"
  >("Voice");
  const [customMinutes, setCustomMinutes] = useState(20);
  const [customWeeks, setCustomWeeks] = useState(4);
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

  const enrolledIds = new Set(enrollments.map((e) => e.plan_id));

  async function handleEnrol(planId: string) {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return;
    setBusyId(planId);
    const result = await enrolPlan(plan);
    setBusyId(null);
    setMessageOk(result.ok);
    setMessage(result.message);
    if (result.ok) {
      void refreshList();
      showToast("Enrolled — free.");
    }
  }

  async function handleCustomEnrol() {
    setBusyId("custom");
    const result = await enrolCustomPlan({
      title: customTitle,
      department: customDepartment,
      minutesPerDay: customMinutes,
      weeks: customWeeks,
    });
    setBusyId(null);
    setMessageOk(result.ok);
    setMessage(result.message);
    if (result.ok) {
      setCustomTitle("");
      void refreshList();
      showToast("Your plan is ready — enrolled.");
    }
  }

  async function handleUnenrol(row: EnrollmentRow) {
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
      <h2>Training Plans</h2>
      <p className="sub">
        Follow a plan for a few weeks, a little every day. All plans are
        free — Rs 0.
      </p>

      {signedIn === false && (
        <p className="note">
          Sign in to enrol in a plan. You can still read every plan below
          without an account.
        </p>
      )}

      <div className="grid">
        {PLANS.map((plan) => (
          <article key={plan.id} className="card">
            <span
              className="chip"
              style={
                {
                  "--dept": deptAccent(plan.department).color,
                  "--dept-soft": deptAccent(plan.department).soft,
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
            <details style={{ marginTop: 10 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "var(--gold)",
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Daily focus
              </summary>
              <ul style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.7 }}>
                {plan.dailyFocus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
            <div className="rowbtns">
              <button
                type="button"
                className="btn btn-gold"
                disabled={
                  signedIn !== true ||
                  busyId === plan.id ||
                  enrolledIds.has(plan.id)
                }
                onClick={() => void handleEnrol(plan.id)}
              >
                {enrolledIds.has(plan.id)
                  ? "Enrolled ✓"
                  : busyId === plan.id
                    ? (
                      <>
                        <span className="spinner" aria-hidden="true" /> Enrolling…
                      </>
                    )
                    : "Enrol — free"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Build your own plan</h3>
        <p className="sub">
          Pick a department, minutes per day and weeks — we save it as your
          custom plan.
        </p>
        <div className="form">
          <div>
            <label htmlFor="custom-title">Plan title</label>
            <input
              id="custom-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. My voice month"
            />
          </div>
          <div>
            <label htmlFor="custom-department">Department</label>
            <select
              id="custom-department"
              value={customDepartment}
              onChange={(e) =>
                setCustomDepartment(
                  e.target.value as Department | "All departments",
                )
              }
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="All departments">All departments</option>
            </select>
          </div>
          <div className="slider-row">
            <label htmlFor="custom-minutes">
              Minutes per day: {customMinutes}
            </label>
            <input
              id="custom-minutes"
              type="range"
              min={5}
              max={60}
              step={5}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
            />
          </div>
          <div className="slider-row">
            <label htmlFor="custom-weeks">Weeks: {customWeeks}</label>
            <input
              id="custom-weeks"
              type="range"
              min={1}
              max={12}
              step={1}
              value={customWeeks}
              onChange={(e) => setCustomWeeks(Number(e.target.value))}
            />
          </div>
          <button
            type="button"
            className="btn btn-gold"
            disabled={signedIn !== true || busyId === "custom"}
            onClick={() => void handleCustomEnrol()}
          >
            {busyId === "custom" ? (
              <>
                <span className="spinner" aria-hidden="true" /> Saving…
              </>
            ) : (
              "Save my plan — free"
            )}
          </button>
        </div>
      </div>

      {signedIn === true && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>My plans</h3>
          {enrollments.length === 0 && (
            <p className="sub">You are not enrolled in any plan yet.</p>
          )}
          {enrollments.length > 0 && (
            <ul className="session-list">
              {enrollments.map((row) => (
                <li key={row.id} style={{ display: "block" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "baseline",
                    }}
                  >
                    <strong>{row.plan_title}</strong>
                    <span className="muted">
                      since {formatDate(row.created_at)}
                    </span>
                  </div>
                  {row.custom_details && (
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      {describeCustom(row)}
                    </p>
                  )}
                  <div className="rowbtns">
                    <button
                      type="button"
                      className="btn btn-line"
                      disabled={busyId === row.id}
                      onClick={() => void handleUnenrol(row)}
                    >
                      Leave plan
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
