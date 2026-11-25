// ACTORVERSE — Admin Panel (Phase 5)
// First-run Super Admin bootstrap: the FIRST user to complete admin setup
// becomes Super Admin. The owner must do this first, before sharing the
// app with anyone — whoever claims it first controls the app.
// Roles: Super Admin / Content Manager / Support Manager / Moderator.
// Subscriptions: Free Mode is ON by default (everything free, Rs 0). Pro
// Rs 12,000/year and Premium Rs 24,000/year are stored settings the Super
// Admin can edit; a toggle switches paid plans back on. There is NO payment
// gateway and NO charging anywhere in this app.

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  ADMIN_ROLES,
  claimSuperAdmin,
  getAdminStats,
  getAdminStatus,
  getAppSettings,
  listAdminRoles,
  listProfiles,
  saveAppSettings,
  setUserRole,
} from "@/lib/admin";
import type {
  AdminRole,
  AdminRoleRow,
  AdminStats,
  AppSettings,
  ProfileRow,
} from "@/lib/admin";
import { EXERCISES, DEPARTMENTS } from "@/data/exercises";
import { MONOLOGUES } from "@/data/monologues";
import { PLANS } from "@/data/plans";

export default function AdminPage() {
  const [configured] = useState(isSupabaseConfigured());
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    freeMode: true,
    proPriceYearly: 12000,
    premiumPriceYearly: 24000,
  });
  const [proPrice, setProPrice] = useState("12000");
  const [premiumPrice, setPremiumPrice] = useState("24000");
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshAll = useCallback(async () => {
    const status = await getAdminStatus();
    setSignedIn(status.signedIn);
    setUserId(status.userId);
    setMyRole(status.role);
    setSetupNeeded(status.setupNeeded);
    const s = await getAppSettings();
    setSettings(s);
    setProPrice(String(s.proPriceYearly));
    setPremiumPrice(String(s.premiumPriceYearly));
    if (status.isAdmin) {
      setRoles(await listAdminRoles());
      setProfiles(await listProfiles());
      setStats(await getAdminStats());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured) {
        setLoading(false);
        return;
      }
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setLoading(false);
          return;
        }
        await refreshAll();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, refreshAll]);

  async function handleClaim() {
    setBusy(true);
    setMessage(null);
    const error = await claimSuperAdmin();
    setBusy(false);
    if (error) {
      setMessageOk(false);
      setMessage(error);
      return;
    }
    setMessageOk(true);
    setMessage("You are now the Super Admin. Keep this account safe.");
    await refreshAll();
  }

  async function handleSaveSettings() {
    const pro = Number(proPrice);
    const premium = Number(premiumPrice);
    if (!Number.isFinite(pro) || pro < 0 || !Number.isFinite(premium) || premium < 0) {
      setMessageOk(false);
      setMessage("Prices must be numbers, 0 or more.");
      return;
    }
    setBusy(true);
    const error = await saveAppSettings({
      freeMode: settings.freeMode,
      proPriceYearly: pro,
      premiumPriceYearly: premium,
    });
    setBusy(false);
    if (error) {
      setMessageOk(false);
      setMessage(error);
      return;
    }
    setMessageOk(true);
    setMessage("Settings saved.");
    await refreshAll();
  }

  async function handleRoleChange(
    target: ProfileRow,
    role: AdminRole | null,
  ) {
    const superAdmins = roles.filter((r) => r.role === "Super Admin");
    const isLastSuperAdmin =
      role === null &&
      superAdmins.length === 1 &&
      superAdmins[0].user_id === target.id;
    setBusy(true);
    const error = await setUserRole(
      target.id,
      role,
      userId ?? "",
      isLastSuperAdmin,
    );
    setBusy(false);
    if (error) {
      setMessageOk(false);
      setMessage(error);
      return;
    }
    setMessageOk(true);
    setMessage(
      role ? `${target.full_name || "User"} is now ${role}.` : "Role removed.",
    );
    await refreshAll();
  }

  const roleOf = (id: string): string | null =>
    roles.find((r) => r.user_id === id)?.role ?? null;

  if (loading) {
    return (
      <section className="section">
        <h2>Admin Panel</h2>
        <p className="sub">Loading…</p>
      </section>
    );
  }

  return (
    <section className="section">
      <h2>Admin Panel</h2>
      <p className="sub">
        Run the app: people, roles and subscription settings. Only admins
        can use this page.
      </p>

      {!configured && (
        <p className="note">
          Sign-in is not set up yet, so the Admin Panel cannot work.
        </p>
      )}

      {configured && !signedIn && (
        <p className="note">
          Sign in first. Admin setup must be done by the app owner.
        </p>
      )}

      {configured && signedIn && setupNeeded && (
        <div className="card">
          <span className="chip">First setup</span>
          <h3 style={{ marginTop: 0 }}>Become the first Super Admin</h3>
          <p>
            No admin exists yet. The first person to claim this becomes the
            Super Admin — the owner of the app.
          </p>
          <p>
            <strong>
              Only the app owner should do this, and only before sharing the
              app with anyone.
            </strong>{" "}
            Whoever claims it first controls roles and settings.
          </p>
          <button
            type="button"
            className="btn btn-gold"
            disabled={busy}
            onClick={() => void handleClaim()}
          >
            {busy ? "Please wait…" : "I am the owner — make me Super Admin"}
          </button>
        </div>
      )}

      {configured && signedIn && !setupNeeded && !myRole && (
        <p className="note">
          You are signed in, but you are not an admin. Ask a Super Admin to
          give you a role.
        </p>
      )}

      {configured && signedIn && myRole && (
        <>
          <p className="note">
            Signed in as admin — <strong>{myRole}</strong>
            {myRole !== "Super Admin" &&
              " (only a Super Admin can change settings and roles)."}
          </p>

          <div className="hero-stats" style={{ justifyContent: "flex-start" }}>
            <div className="hstat">
              <b>{stats?.users ?? "—"}</b>
              <span>Users</span>
            </div>
            <div className="hstat">
              <b>{stats?.sessions ?? "—"}</b>
              <span>Sessions</span>
            </div>
            <div className="hstat">
              <b>{stats?.recordings ?? "—"}</b>
              <span>Takes</span>
            </div>
            <div className="hstat">
              <b>{stats?.scripts ?? "—"}</b>
              <span>Scripts</span>
            </div>
            <div className="hstat">
              <b>{stats?.posts ?? "—"}</b>
              <span>Posts</span>
            </div>
            <div className="hstat">
              <b>{stats?.auditions ?? "—"}</b>
              <span>Auditions</span>
            </div>
            <div className="hstat">
              <b>{stats?.enrollments ?? "—"}</b>
              <span>Enrolments</span>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Subscriptions</h3>
            <p className="sub">
              Free Mode is ON by default — everything is free (Rs 0). Turn it
              off only when paid plans are ready. There is no payment gateway
              in this app, so turning paid plans on only shows the prices —
              it never charges anyone.
            </p>
            <div className="form">
              <div>
                <label htmlFor="free-mode">Free Mode</label>
                <select
                  id="free-mode"
                  value={settings.freeMode ? "on" : "off"}
                  disabled={myRole !== "Super Admin"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      freeMode: e.target.value === "on",
                    })
                  }
                >
                  <option value="on">ON — everything free (Rs 0)</option>
                  <option value="off">OFF — show Pro / Premium prices</option>
                </select>
              </div>
              <div>
                <label htmlFor="pro-price">Pro price per year (Rs)</label>
                <input
                  id="pro-price"
                  type="number"
                  min={0}
                  value={proPrice}
                  disabled={myRole !== "Super Admin"}
                  onChange={(e) => setProPrice(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="premium-price">
                  Premium price per year (Rs)
                </label>
                <input
                  id="premium-price"
                  type="number"
                  min={0}
                  value={premiumPrice}
                  disabled={myRole !== "Super Admin"}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-gold"
                disabled={busy || myRole !== "Super Admin"}
                onClick={() => void handleSaveSettings()}
              >
                {busy ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>People &amp; roles</h3>
            <p className="sub">
              Give a signed-up user an admin role. Removing the last Super
              Admin is blocked — add another Super Admin first.
            </p>
            {profiles.length === 0 && (
              <p className="sub">No users yet.</p>
            )}
            {profiles.length > 0 && (
              <ul className="session-list">
                {profiles.map((p) => (
                  <li key={p.id} style={{ display: "block" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>{p.full_name || "No name"}</strong>
                      <span className="muted">
                        {roleOf(p.id) ?? "No role"}
                        {p.id === userId ? " · you" : ""}
                      </span>
                    </div>
                    <div className="rowbtns">
                      <select
                        aria-label={`Role for ${p.full_name || "user"}`}
                        value={roleOf(p.id) ?? ""}
                        disabled={busy || myRole !== "Super Admin"}
                        onChange={(e) =>
                          void handleRoleChange(
                            p,
                            (e.target.value || null) as AdminRole | null,
                          )
                        }
                      >
                        <option value="">No role</option>
                        {ADMIN_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Content</h3>
            <p className="sub">
              The training content lives in the app itself. Counts are live:
            </p>
            <ul className="session-list">
              <li>
                <span>
                  <strong>{EXERCISES.length}</strong> exercises ·{" "}
                  {DEPARTMENTS.length} departments
                </span>
              </li>
              <li>
                <span>
                  <strong>{MONOLOGUES.length}</strong> monologues
                </span>
              </li>
              <li>
                <span>
                  <strong>{PLANS.length}</strong> training plans
                </span>
              </li>
            </ul>
            <p className="sub" style={{ marginTop: 10 }}>
              To add or change an exercise, monologue or plan, edit the data
              files in the app code (<code>src/data/</code>) and redeploy.
            </p>
          </div>
        </>
      )}

      {message && (
        <p className={messageOk ? "success" : "error"} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
