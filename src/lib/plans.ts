// ACTORVERSE — Training plan enrolments (Phase 3)
// Enrolling is free: Free Mode is on, so every plan costs Rs 0. Enrolments
// are own-rows-only — a user can only see and remove their own enrolments.

import { createClient, isSupabaseConfigured } from "./supabase";
import type { Department } from "@/data/exercises";
import type { TrainingPlan } from "@/data/plans";

export interface EnrollmentRow {
  id: string;
  user_id: string;
  plan_id: string;
  plan_title: string;
  custom_details: string | null;
  created_at: string;
}

export interface EnrolResult {
  ok: boolean;
  message: string;
  row?: EnrollmentRow;
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("could not find the table") ||
    (lower.includes("relation") && lower.includes("does not exist"))
  ) {
    return (
      "Enrolments are not set up yet. Run " +
      "supabase/migrations/0008_enrollments.sql once in the Supabase SQL Editor, then try again."
    );
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) {
    return "You are already enrolled in this plan.";
  }
  return message;
}

/** Load the signed-in user's enrolments, newest first. */
export async function listMyEnrollments(): Promise<EnrollmentRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("enrollments")
      .select("id, user_id, plan_id, plan_title, custom_details, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as EnrollmentRow[];
  } catch {
    return [];
  }
}

async function insertEnrolment(values: {
  user_id: string;
  plan_id: string;
  plan_title: string;
  custom_details: string | null;
}): Promise<EnrolResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .insert(values)
    .select("id, user_id, plan_id, plan_title, custom_details, created_at")
    .single();
  if (error) return { ok: false, message: friendlyError(error.message) };
  return {
    ok: true,
    message: "Enrolled. Good luck with your training.",
    row: data as EnrollmentRow,
  };
}

/** Enrol in one of the 7 built-in plans. Free — Rs 0. */
export async function enrolPlan(plan: TrainingPlan): Promise<EnrolResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sign-in is not set up yet." };
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, message: "Sign in to enrol in a plan." };
    }
    return await insertEnrolment({
      user_id: user.id,
      plan_id: plan.id,
      plan_title: plan.title,
      custom_details: null,
    });
  } catch (err) {
    return {
      ok: false,
      message: `Could not enrol: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }
}

/** Build and enrol in a custom plan. Free — Rs 0. */
export async function enrolCustomPlan(input: {
  title: string;
  department: Department | "All departments";
  minutesPerDay: number;
  weeks: number;
}): Promise<EnrolResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, message: "Give your plan a title." };
  if (input.minutesPerDay < 5 || input.minutesPerDay > 180) {
    return { ok: false, message: "Pick 5 to 180 minutes per day." };
  }
  if (input.weeks < 1 || input.weeks > 12) {
    return { ok: false, message: "Pick 1 to 12 weeks." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sign-in is not set up yet." };
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, message: "Sign in to enrol in a plan." };
    }
    return await insertEnrolment({
      user_id: user.id,
      plan_id: "custom",
      plan_title: title,
      custom_details: JSON.stringify({
        department: input.department,
        minutesPerDay: input.minutesPerDay,
        weeks: input.weeks,
      }),
    });
  } catch (err) {
    return {
      ok: false,
      message: `Could not enrol: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }
}

/** Leave a plan. Returns an error message or null. */
export async function unenrol(id: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const { error } = await supabase.from("enrollments").delete().eq("id", id);
    if (error) return `Could not leave the plan: ${error.message}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not leave. Try again.";
  }
}
