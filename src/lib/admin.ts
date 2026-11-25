// ACTORVERSE — Admin Panel helpers (Phase 5)
// First-run Super Admin bootstrap: the FIRST user to complete admin setup
// becomes Super Admin (the owner must do this first, before sharing the
// app). Roles: Super Admin / Content Manager / Support Manager / Moderator.
// Subscriptions are structure only: Free Mode is ON by default, Pro and
// Premium prices are stored settings the Super Admin can edit. There is NO
// payment gateway and NO charging anywhere in this app.

import { createClient, isSupabaseConfigured } from "./supabase";

export const ADMIN_ROLES = [
  "Super Admin",
  "Content Manager",
  "Support Manager",
  "Moderator",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AppSettings {
  freeMode: boolean;
  proPriceYearly: number;
  premiumPriceYearly: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  freeMode: true,
  proPriceYearly: 12000,
  premiumPriceYearly: 24000,
};

export interface AdminRoleRow {
  user_id: string;
  role: string;
  granted_by: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  created_at: string;
}

export interface AdminStats {
  users: number;
  sessions: number;
  recordings: number;
  scripts: number;
  posts: number;
  auditions: number;
  enrollments: number;
}

/** Read the subscription settings. Defaults apply when the table is empty. */
export async function getAppSettings(): Promise<AppSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;
    const map: Record<string, string> = {};
    for (const row of data as { key: string; value: string }[]) {
      map[row.key] = row.value;
    }
    return {
      freeMode: map["free_mode"] ? map["free_mode"] === "true" : true,
      proPriceYearly: Number(map["pro_price_yearly"] ?? 12000) || 12000,
      premiumPriceYearly:
        Number(map["premium_price_yearly"] ?? 24000) || 24000,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Save the subscription settings (Super Admin only — enforced by RLS). */
export async function saveAppSettings(
  settings: AppSettings,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const rows = [
      { key: "free_mode", value: settings.freeMode ? "true" : "false" },
      { key: "pro_price_yearly", value: String(settings.proPriceYearly) },
      {
        key: "premium_price_yearly",
        value: String(settings.premiumPriceYearly),
      },
    ];
    const { error } = await supabase.from("app_settings").upsert(rows);
    if (error) {
      if (error.message.toLowerCase().includes("row-level security")) {
        return "Only a Super Admin can change these settings.";
      }
      return `Could not save: ${error.message}`;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Save failed. Try again.";
  }
}

export interface AdminStatus {
  signedIn: boolean;
  userId: string | null;
  isAdmin: boolean;
  role: string | null;
  adminCount: number;
  setupNeeded: boolean;
}

/** Who is the current user in the admin system? */
export async function getAdminStatus(): Promise<AdminStatus> {
  const empty: AdminStatus = {
    signedIn: false,
    userId: null,
    isAdmin: false,
    role: null,
    adminCount: 0,
    setupNeeded: false,
  };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;
    const { data, error } = await supabase
      .from("admin_roles")
      .select("user_id, role");
    if (error) {
      // Table missing means admin was never set up.
      return { ...empty, signedIn: true, userId: user.id, setupNeeded: true };
    }
    const rows = (data ?? []) as AdminRoleRow[];
    const mine = rows.find((r) => r.user_id === user.id);
    return {
      signedIn: true,
      userId: user.id,
      isAdmin: Boolean(mine),
      role: mine ? mine.role : null,
      adminCount: rows.length,
      setupNeeded: rows.length === 0,
    };
  } catch {
    return empty;
  }
}

/** Claim the first Super Admin seat. Only works when no admin exists yet. */
export async function claimSuperAdmin(): Promise<string | null> {
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Sign in first.";
    const { error } = await supabase.from("admin_roles").insert({
      user_id: user.id,
      role: "Super Admin",
      granted_by: user.id,
    });
    if (error) {
      const lower = error.message.toLowerCase();
      if (
        lower.includes("could not find the table") ||
        (lower.includes("relation") && lower.includes("does not exist"))
      ) {
        return "Admin is not set up yet. Run supabase/migrations/0011_admin.sql once in the Supabase SQL Editor, then try again.";
      }
      if (lower.includes("row-level security")) {
        return "A Super Admin already exists. Ask them to add you.";
      }
      return `Could not claim: ${error.message}`;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not claim. Try again.";
  }
}

/** All admin roles (Super Admin only can read the full list via RLS). */
export async function listAdminRoles(): Promise<AdminRoleRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admin_roles")
      .select("user_id, role, granted_by, created_at")
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as AdminRoleRow[];
  } catch {
    return [];
  }
}

/** All signed-up users (Super Admin only — RLS enforces it). */
export async function listProfiles(): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as ProfileRow[];
  } catch {
    return [];
  }
}

/**
 * Set a user's admin role. Pass null to remove the role. Only a Super
 * Admin can do this (RLS enforces it). Refuses to remove the last
 * Super Admin — the caller checks the count first and passes
 * `isLastSuperAdmin` when the target holds the only Super Admin seat.
 */
export async function setUserRole(
  targetUserId: string,
  role: AdminRole | null,
  grantedBy: string,
  isLastSuperAdmin: boolean,
): Promise<string | null> {
  if (role === null && isLastSuperAdmin) {
    return "You cannot remove the last Super Admin. Add another Super Admin first.";
  }
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    if (role === null) {
      const { error } = await supabase
        .from("admin_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (error) return `Could not remove the role: ${error.message}`;
      return null;
    }
    const { error } = await supabase.from("admin_roles").upsert({
      user_id: targetUserId,
      role,
      granted_by: grantedBy,
    });
    if (error) {
      if (error.message.toLowerCase().includes("row-level security")) {
        return "Only a Super Admin can change roles.";
      }
      return `Could not set the role: ${error.message}`;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not save. Try again.";
  }
}

/** Real counts from the app's tables (Super Admin only — RLS enforces it). */
export async function getAdminStats(): Promise<AdminStats> {
  const zero: AdminStats = {
    users: 0,
    sessions: 0,
    recordings: 0,
    scripts: 0,
    posts: 0,
    auditions: 0,
    enrollments: 0,
  };
  if (!isSupabaseConfigured()) return zero;
  try {
    const supabase = createClient();
    const tables: (keyof AdminStats)[] = [
      "users",
      "sessions",
      "recordings",
      "scripts",
      "posts",
      "auditions",
      "enrollments",
    ];
    const tableNames: Record<keyof AdminStats, string> = {
      users: "profiles",
      sessions: "sessions",
      recordings: "recordings",
      scripts: "scripts",
      posts: "posts",
      auditions: "auditions",
      enrollments: "enrollments",
    };
    const out: AdminStats = { ...zero };
    for (const key of tables) {
      const { count } = await supabase
        .from(tableNames[key])
        .select("id", { count: "exact", head: true });
      out[key] = count ?? 0;
    }
    return out;
  } catch {
    return zero;
  }
}
