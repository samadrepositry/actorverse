// ACTORVERSE — Community posts + Audition Center (Phase 4)
// Both start EMPTY — no fake posts, no fake auditions. Signed-in users can
// read everything and write their own rows; they can only delete their own.
// Audition owners can also read the applications on their own auditions.

import { createClient, isSupabaseConfigured } from "./supabase";

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface PostRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface PostWithAuthor extends PostRow {
  authorName: string;
}

/** Load the newest posts (max 50) with the author's name from profiles. */
export async function listPosts(): Promise<PostWithAuthor[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("posts")
      .select("id, user_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    const rows = data as PostRow[];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    let names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
        names[p.id] = p.full_name?.trim() || "Actor";
      }
    }
    return rows.map((r) => ({
      ...r,
      authorName: names[r.user_id] || "Actor",
    }));
  } catch {
    return [];
  }
}

/** Post a message to the community (max 500 characters). */
export async function createPost(
  body: string,
): Promise<{ ok: boolean; message: string; row?: PostRow }> {
  const clean = body.trim();
  if (!clean) return { ok: false, message: "Write something first." };
  if (clean.length > 500) {
    return { ok: false, message: "Keep it under 500 characters." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sign-in is not set up yet." };
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Sign in to post." };
    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id: user.id, body: clean })
      .select("id, user_id, body, created_at")
      .single();
    if (error) {
      const lower = error.message.toLowerCase();
      if (
        lower.includes("could not find the table") ||
        (lower.includes("relation") && lower.includes("does not exist"))
      ) {
        return {
          ok: false,
          message:
            "Community is not set up yet. Run supabase/migrations/0009_posts.sql once in the Supabase SQL Editor, then try again.",
        };
      }
      return { ok: false, message: `Could not post: ${error.message}` };
    }
    return { ok: true, message: "Posted.", row: data as PostRow };
  } catch (err) {
    return {
      ok: false,
      message: `Could not post: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }
}

/** Delete your own post. Returns an error message or null. */
export async function deleteMyPost(id: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return `Could not delete: ${error.message}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Delete failed. Try again.";
  }
}

// ---------------------------------------------------------------------------
// Auditions
// ---------------------------------------------------------------------------

export interface AuditionRow {
  id: string;
  user_id: string;
  title: string;
  role_description: string;
  location: string;
  deadline: string | null;
  created_at: string;
}

export interface ApplicationRow {
  id: string;
  audition_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

/** Load open auditions, newest first (max 50). */
export async function listAuditions(): Promise<AuditionRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("auditions")
      .select("id, user_id, title, role_description, location, deadline, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data as AuditionRow[];
  } catch {
    return [];
  }
}

/** Post an audition listing. */
export async function createAudition(input: {
  title: string;
  roleDescription: string;
  location: string;
  deadline: string;
}): Promise<{ ok: boolean; message: string; row?: AuditionRow }> {
  const title = input.title.trim();
  const roleDescription = input.roleDescription.trim();
  const location = input.location.trim();
  if (!title) return { ok: false, message: "Give the audition a title." };
  if (!roleDescription) {
    return { ok: false, message: "Describe the role." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sign-in is not set up yet." };
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Sign in to post an audition." };
    const { data, error } = await supabase
      .from("auditions")
      .insert({
        user_id: user.id,
        title,
        role_description: roleDescription,
        location: location || "Not given",
        deadline: input.deadline ? input.deadline : null,
      })
      .select("id, user_id, title, role_description, location, deadline, created_at")
      .single();
    if (error) {
      const lower = error.message.toLowerCase();
      if (
        lower.includes("could not find the table") ||
        (lower.includes("relation") && lower.includes("does not exist"))
      ) {
        return {
          ok: false,
          message:
            "Auditions are not set up yet. Run supabase/migrations/0010_auditions.sql once in the Supabase SQL Editor, then try again.",
        };
      }
      return { ok: false, message: `Could not post: ${error.message}` };
    }
    return { ok: true, message: "Audition posted.", row: data as AuditionRow };
  } catch (err) {
    return {
      ok: false,
      message: `Could not post: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }
}

/** Delete your own audition listing (and its applications). */
export async function deleteMyAudition(id: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const { error } = await supabase.from("auditions").delete().eq("id", id);
    if (error) return `Could not delete: ${error.message}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Delete failed. Try again.";
  }
}

/** Apply to an audition. One application per user per audition. */
export async function applyToAudition(
  auditionId: string,
  message: string,
): Promise<{ ok: boolean; message: string }> {
  const clean = message.trim();
  if (!clean) return { ok: false, message: "Write a short message first." };
  if (clean.length > 500) {
    return { ok: false, message: "Keep it under 500 characters." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sign-in is not set up yet." };
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Sign in to apply." };
    const { error } = await supabase.from("applications").insert({
      audition_id: auditionId,
      user_id: user.id,
      message: clean,
    });
    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes("duplicate key") || lower.includes("already exists")) {
        return { ok: false, message: "You already applied to this audition." };
      }
      if (
        lower.includes("could not find the table") ||
        (lower.includes("relation") && lower.includes("does not exist"))
      ) {
        return {
          ok: false,
          message:
            "Auditions are not set up yet. Run supabase/migrations/0010_auditions.sql once in the Supabase SQL Editor, then try again.",
        };
      }
      return { ok: false, message: `Could not apply: ${error.message}` };
    }
    return { ok: true, message: "Application sent." };
  } catch (err) {
    return {
      ok: false,
      message: `Could not apply: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }
}

/** The signed-in user's own applications, newest first. */
export async function listMyApplications(): Promise<ApplicationRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("applications")
      .select("id, audition_id, user_id, message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as ApplicationRow[];
  } catch {
    return [];
  }
}

/** Applications on one audition (only the audition owner can read them). */
export async function listApplicationsForAudition(
  auditionId: string,
): Promise<ApplicationRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("applications")
      .select("id, audition_id, user_id, message, created_at")
      .eq("audition_id", auditionId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as ApplicationRow[];
  } catch {
    return [];
  }
}
