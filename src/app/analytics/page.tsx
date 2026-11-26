import Link from "next/link";
import type { CSSProperties } from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-shared";
import { DEPARTMENTS } from "@/data/exercises";
import { deptAccent } from "@/lib/theme";
import GoalSetter from "@/components/GoalSetter";

interface SessionRow {
  id: string;
  exercise_title: string;
  department: string;
  kind: string;
  minutes: number;
  created_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Consecutive days with at least one session, ending today (or yesterday). */
function computeStreak(sessions: SessionRow[]): number {
  const days = new Set(sessions.map((s) => dateKey(new Date(s.created_at))));
  let streak = 0;
  let cursor = startOfDay(new Date());
  // If nothing today yet, the streak can still count from yesterday.
  if (!days.has(dateKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

function minutesPerDay(sessions: SessionRow[], days: number): { label: string; minutes: number }[] {
  const today = startOfDay(new Date());
  const buckets: { label: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * DAY_MS);
    buckets.push({ label: dayLabel(day), minutes: 0 });
  }
  const indexByKey = new Map<string, number>();
  buckets.forEach((b, i) => {
    const day = new Date(today.getTime() - (days - 1 - i) * DAY_MS);
    indexByKey.set(dateKey(day), i);
  });
  for (const s of sessions) {
    const idx = indexByKey.get(dateKey(new Date(s.created_at)));
    if (idx !== undefined) buckets[idx].minutes += s.minutes;
  }
  return buckets;
}

function BarChart({
  title,
  data,
  accent = "var(--gold-gradient)",
  compact = false,
}: {
  title: string;
  data: { label: string; minutes: number }[];
  accent?: string;
  compact?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  return (
    <div
      className="card card-accent"
      style={
        {
          "--card-accent": "#8fa8ff",
          "--card-soft": "rgba(143, 168, 255, 0.10)",
        } as CSSProperties
      }
    >
      <h3>{title}</h3>
      <div
        className="bar-row"
        style={compact ? { gap: 2 } : undefined}
        role="img"
        aria-label={`${title}: ${data.map((d) => `${d.label} ${d.minutes} min`).join(", ")}`}
      >
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div
              className="bar"
              style={{
                height: `${Math.max(3, (d.minutes / max) * 96)}px`,
                background: accent,
              }}
              title={`${d.label}: ${d.minutes} min`}
            />
            {/* In the 30-day chart only every 5th label is shown, so the
                columns stay clean and readable on phones. */}
            <span>{!compact || i % 5 === 0 ? `${d.minutes}m` : ""}</span>
            <span>{!compact || i % 5 === 0 ? d.label : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <section className="section" data-page="analytics">
        <div className="page-head">
          <span className="eyebrow">Progress</span>
          <h1>Analytics</h1>
          <span className="accent-bar" aria-hidden="true" />
          <p>Your practice, in numbers.</p>
        </div>
        <div className="note">
          Supabase is not set up yet. Add the Supabase URL and anon key to{" "}
          <code>.env.local</code> (see <code>.env.example</code>), then sign in
          to see your analytics.
        </div>
      </section>
    );
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="section" data-page="analytics">
        <div className="page-head">
          <span className="eyebrow">Progress</span>
          <h1>Analytics</h1>
          <span className="accent-bar" aria-hidden="true" />
          <p>
            Sign in to see your practice minutes, streak, weekly goal and
            progress by department.
          </p>
        </div>
        <div className="rowbtns">
          <Link href="/#signin" className="btn btn-gold">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("id, exercise_title, department, kind, minutes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  const sessions = (sessionsData ?? []) as SessionRow[];

  const { data: goalData } = await supabase
    .from("weekly_goals")
    .select("minutes_per_week")
    .eq("user_id", user.id)
    .maybeSingle();
  const weeklyGoal = goalData?.minutes_per_week ?? 150;

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const streak = computeStreak(sessions);
  const last7 = minutesPerDay(sessions, 7);
  const last30 = minutesPerDay(sessions, 30);
  const thisWeekMinutes = last7.reduce((sum, d) => sum + d.minutes, 0);

  const byDepartment = new Map<string, number>();
  for (const s of sessions) {
    byDepartment.set(s.department, (byDepartment.get(s.department) ?? 0) + s.minutes);
  }
  const maxDeptMinutes = Math.max(1, ...byDepartment.values());

  return (
    <section className="section" data-page="analytics">
      <div className="page-head">
        <span className="eyebrow">Progress</span>
        <h1>Analytics</h1>
        <span className="accent-bar" aria-hidden="true" />
        <p>Your practice, in numbers.</p>
      </div>

      <div className="hero-stats" style={{ justifyContent: "flex-start" }}>
        <div
          className="hstat"
          style={
            {
              "--hstat-accent": "#8fa8ff",
              "--hstat-soft": "rgba(143, 168, 255, 0.12)",
            } as CSSProperties
          }
        >
          <b>{totalMinutes}</b>
          <span>Total minutes</span>
        </div>
        <div
          className="hstat"
          style={
            {
              "--hstat-accent": "#8fa8ff",
              "--hstat-soft": "rgba(143, 168, 255, 0.12)",
            } as CSSProperties
          }
        >
          <b>{streak}</b>
          <span>Day streak</span>
        </div>
        <div
          className="hstat"
          style={
            {
              "--hstat-accent": "#8fa8ff",
              "--hstat-soft": "rgba(143, 168, 255, 0.12)",
            } as CSSProperties
          }
        >
          <b>{sessions.length}</b>
          <span>Sessions</span>
        </div>
        <div
          className="hstat"
          style={
            {
              "--hstat-accent": "#8fa8ff",
              "--hstat-soft": "rgba(143, 168, 255, 0.12)",
            } as CSSProperties
          }
        >
          <b>
            {thisWeekMinutes} / {weeklyGoal}
          </b>
          <span>This week / goal</span>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <BarChart
          title="Last 7 days (minutes)"
          data={last7}
          accent="linear-gradient(180deg, #aab8ff 0%, #8fa8ff 100%)"
        />
        <BarChart title="Last 30 days (minutes)" data={last30} compact />
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <div
          className="card card-accent"
          style={
            {
              "--card-accent": "#8fa8ff",
              "--card-soft": "rgba(143, 168, 255, 0.10)",
            } as CSSProperties
          }
        >
          <h3>Weekly goal</h3>
          <p>
            This week: {thisWeekMinutes} of {weeklyGoal} minutes
            {weeklyGoal > 0
              ? ` (${Math.min(100, Math.round((thisWeekMinutes / weeklyGoal) * 100))}%)`
              : ""}
            .
          </p>
          <div className="progress" style={{ marginTop: 12 }}>
            <i
              style={{
                width: `${
                  weeklyGoal > 0
                    ? Math.min(100, Math.round((thisWeekMinutes / weeklyGoal) * 100))
                    : 0
                }%`,
                background:
                  "linear-gradient(180deg, #aab8ff 0%, #8fa8ff 100%)",
              }}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <GoalSetter currentGoal={weeklyGoal} />
          </div>
        </div>
        <div
          className="card card-accent"
          style={
            {
              "--card-accent": "#8fa8ff",
              "--card-soft": "rgba(143, 168, 255, 0.10)",
            } as CSSProperties
          }
        >
          <h3>Progress by department</h3>
          {DEPARTMENTS.map((dept) => {
            const mins = byDepartment.get(dept) ?? 0;
            return (
              <div key={dept} className="progress-row">
                <span>{dept}</span>
                <div
                  className="track"
                  style={
                    { "--dept": deptAccent(dept).color } as CSSProperties
                  }
                >
                  <i style={{ width: `${(mins / maxDeptMinutes) * 100}%` }} />
                </div>
                <span>{mins} min</span>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p style={{ marginTop: 10 }}>
              No sessions yet — finish a timer session and it will show up here.
            </p>
          )}
        </div>
      </div>

      <div className="card card-flat" style={{ marginTop: 14 }}>
        <h3>Recent sessions</h3>
        {sessions.length === 0 ? (
          <p className="empty">
            <strong>No sessions yet.</strong>Use the timer to log your first
            practice.
          </p>
        ) : (
          <ul className="session-list">
            {sessions.slice(0, 20).map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.exercise_title}</strong>
                  <br />
                  <span className="muted">
                    {s.department} ·{" "}
                    {new Date(s.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span>
                  <strong>{s.minutes} min</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
