// ACTORVERSE — Achievements (Phase 4)
// Badges are computed ONLY from the user's real practice data (sessions
// table): minutes, session count, streak and departments practised. No
// fake numbers, no badges for work that did not happen.

import { createClient, isSupabaseConfigured } from "./supabase";

export interface SessionRow {
  id: string;
  exercise_title: string;
  department: string;
  kind: string;
  minutes: number;
  created_at: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: string;
}

export interface AchievementSummary {
  totalMinutes: number;
  totalSessions: number;
  streak: number;
  departments: number;
  last7DaysMinutes: number;
  badges: Badge[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Consecutive days with at least one session, ending today (or yesterday). */
export function computeStreak(sessions: SessionRow[]): number {
  const days = new Set(sessions.map((s) => dateKey(new Date(s.created_at))));
  let streak = 0;
  let cursor = startOfDay(new Date());
  if (!days.has(dateKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/** Load the signed-in user's sessions for achievements. */
export async function listMySessions(): Promise<SessionRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("sessions")
      .select("id, exercise_title, department, kind, minutes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as SessionRow[];
  } catch {
    return [];
  }
}

export function computeAchievements(sessions: SessionRow[]): AchievementSummary {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const totalSessions = sessions.length;
  const streak = computeStreak(sessions);
  const departments = new Set(sessions.map((s) => s.department)).size;
  const weekAgo = Date.now() - 7 * DAY_MS;
  const last7DaysMinutes = sessions
    .filter((s) => new Date(s.created_at).getTime() >= weekAgo)
    .reduce((sum, s) => sum + (s.minutes || 0), 0);

  const badges: Badge[] = [
    {
      id: "first-steps",
      title: "First Steps",
      description: "Finish your first practice session.",
      earned: totalSessions >= 1,
      progress: `${Math.min(totalSessions, 1)} / 1 session`,
    },
    {
      id: "ten-sessions",
      title: "Ten Sessions",
      description: "Finish 10 practice sessions.",
      earned: totalSessions >= 10,
      progress: `${Math.min(totalSessions, 10)} / 10 sessions`,
    },
    {
      id: "thirty-sessions",
      title: "Thirty Sessions",
      description: "Finish 30 practice sessions.",
      earned: totalSessions >= 30,
      progress: `${Math.min(totalSessions, 30)} / 30 sessions`,
    },
    {
      id: "hundred-minutes",
      title: "100 Minutes",
      description: "Practise for 100 minutes in total.",
      earned: totalMinutes >= 100,
      progress: `${Math.min(totalMinutes, 100)} / 100 minutes`,
    },
    {
      id: "five-hundred-minutes",
      title: "500 Minutes",
      description: "Practise for 500 minutes in total.",
      earned: totalMinutes >= 500,
      progress: `${Math.min(totalMinutes, 500)} / 500 minutes`,
    },
    {
      id: "seven-day-streak",
      title: "7-Day Streak",
      description: "Practise 7 days in a row.",
      earned: streak >= 7,
      progress: `${Math.min(streak, 7)} / 7 days`,
    },
    {
      id: "all-rounder",
      title: "All-Rounder",
      description: "Practise in 5 different departments.",
      earned: departments >= 5,
      progress: `${Math.min(departments, 5)} / 5 departments`,
    },
    {
      id: "marathon-week",
      title: "Marathon Week",
      description: "Practise 150 minutes in the last 7 days.",
      earned: last7DaysMinutes >= 150,
      progress: `${Math.min(last7DaysMinutes, 150)} / 150 minutes`,
    },
  ];

  return {
    totalMinutes,
    totalSessions,
    streak,
    departments,
    last7DaysMinutes,
    badges,
  };
}
