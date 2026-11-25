// ACTORVERSE — Audition Center (Phase 4)
// Audition listings anyone signed in can post, and apply to. Starts
// EMPTY — no fake auditions. One application per user per audition.
// Audition owners can read the applications on their own listings.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  applyToAudition,
  createAudition,
  deleteMyAudition,
  listApplicationsForAudition,
  listAuditions,
  listMyApplications,
} from "@/lib/community";
import type { ApplicationRow, AuditionRow } from "@/lib/community";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function AuditionsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [auditions, setAuditions] = useState<AuditionRow[]>([]);
  const [myApplications, setMyApplications] = useState<ApplicationRow[]>([]);
  const [title, setTitle] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [viewingAppsId, setViewingAppsId] = useState<string | null>(null);
  const [viewingApps, setViewingApps] = useState<ApplicationRow[]>([]);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const refreshAll = useCallback(async () => {
    setAuditions(await listAuditions());
    setMyApplications(await listMyApplications());
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
        setUserId(user ? user.id : null);
        if (user && !loadedOnce.current) {
          loadedOnce.current = true;
          await refreshAll();
        }
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAll]);

  const appliedIds = new Set(myApplications.map((a) => a.audition_id));

  async function handlePostAudition() {
    setPosting(true);
    setMessage(null);
    const result = await createAudition({
      title,
      roleDescription,
      location,
      deadline,
    });
    setPosting(false);
    setMessageOk(result.ok);
    setMessage(result.message);
    if (result.ok) {
      setTitle("");
      setRoleDescription("");
      setLocation("");
      setDeadline("");
      await refreshAll();
    }
  }

  async function handleApply(audition: AuditionRow) {
    setRowBusy(audition.id);
    const result = await applyToAudition(audition.id, applyMessage);
    setRowBusy(null);
    setMessageOk(result.ok);
    setMessage(result.message);
    if (result.ok) {
      setApplyingId(null);
      setApplyMessage("");
      await refreshAll();
    }
  }

  async function handleDelete(audition: AuditionRow) {
    if (!window.confirm(`Delete "${audition.title}"? This cannot be undone.`)) {
      return;
    }
    setRowBusy(audition.id);
    const error = await deleteMyAudition(audition.id);
    setRowBusy(null);
    if (error) {
      setMessageOk(false);
      setMessage(error);
      return;
    }
    setMessageOk(true);
    setMessage("Deleted.");
    await refreshAll();
  }

  async function handleViewApplications(audition: AuditionRow) {
    if (viewingAppsId === audition.id) {
      setViewingAppsId(null);
      setViewingApps([]);
      return;
    }
    setRowBusy(audition.id);
    const rows = await listApplicationsForAudition(audition.id);
    setRowBusy(null);
    setViewingAppsId(audition.id);
    setViewingApps(rows);
  }

  return (
    <section className="section">
      <h2>Audition Center</h2>
      <p className="sub">
        Find auditions, or post one of your own. Apply with a short message.
        One application per audition.
      </p>

      {signedIn === false && (
        <p className="note">
          Sign in to see auditions, post one, or apply.
        </p>
      )}

      {signedIn === true && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>Post an audition</h3>
            <div className="form">
              <div>
                <label htmlFor="aud-title">Title</label>
                <input
                  id="aud-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lead role — short film"
                />
              </div>
              <div>
                <label htmlFor="aud-role">Role description</label>
                <textarea
                  id="aud-role"
                  rows={3}
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Who are you looking for? Age, look, skills…"
                />
              </div>
              <div>
                <label htmlFor="aud-location">Location</label>
                <input
                  id="aud-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Karachi"
                />
              </div>
              <div>
                <label htmlFor="aud-deadline">Deadline (optional)</label>
                <input
                  id="aud-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-gold"
                disabled={posting}
                onClick={() => void handlePostAudition()}
              >
                {posting ? "Posting…" : "Post audition"}
              </button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>Open auditions</h3>
            {auditions.length === 0 && (
              <p className="sub">
                No auditions yet. Post the first one above.
              </p>
            )}
            {auditions.length > 0 && (
              <ul className="session-list">
                {auditions.map((aud) => (
                  <li key={aud.id} style={{ display: "block" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                      }}
                    >
                      <strong>{aud.title}</strong>
                      <span className="muted">
                        {aud.location}
                        {aud.deadline
                          ? ` · closes ${formatDate(aud.deadline)}`
                          : ""}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                      {aud.role_description}
                    </p>
                    {applyingId === aud.id ? (
                      <div className="form" style={{ marginTop: 10 }}>
                        <label htmlFor={`apply-${aud.id}`}>
                          Your message to the caster
                        </label>
                        <textarea
                          id={`apply-${aud.id}`}
                          rows={3}
                          maxLength={500}
                          value={applyMessage}
                          onChange={(e) => setApplyMessage(e.target.value)}
                          placeholder="Introduce yourself in a few lines…"
                        />
                        <div className="rowbtns" style={{ marginTop: 0 }}>
                          <button
                            type="button"
                            className="btn btn-gold"
                            disabled={rowBusy === aud.id}
                            onClick={() => void handleApply(aud)}
                          >
                            Send application
                          </button>
                          <button
                            type="button"
                            className="btn btn-line"
                            onClick={() => {
                              setApplyingId(null);
                              setApplyMessage("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rowbtns">
                        {aud.user_id === userId ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-line"
                              disabled={rowBusy === aud.id}
                              onClick={() => void handleViewApplications(aud)}
                            >
                              {viewingAppsId === aud.id
                                ? "Hide applications"
                                : "View applications"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-line"
                              disabled={rowBusy === aud.id}
                              onClick={() => void handleDelete(aud)}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-gold"
                            disabled={
                              rowBusy === aud.id || appliedIds.has(aud.id)
                            }
                            onClick={() => {
                              setApplyingId(aud.id);
                              setApplyMessage("");
                              setMessage(null);
                            }}
                          >
                            {appliedIds.has(aud.id)
                              ? "Applied ✓"
                              : "Apply"}
                          </button>
                        )}
                      </div>
                    )}
                    {viewingAppsId === aud.id && (
                      <div style={{ marginTop: 10 }}>
                        {viewingApps.length === 0 ? (
                          <p className="sub">No applications yet.</p>
                        ) : (
                          <ul className="session-list">
                            {viewingApps.map((app) => (
                              <li key={app.id} style={{ display: "block" }}>
                                <p style={{ margin: "4px 0" }}>{app.message}</p>
                                <span className="muted">
                                  {formatDate(app.created_at)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>My applications</h3>
            {myApplications.length === 0 && (
              <p className="sub">You have not applied to any audition yet.</p>
            )}
            {myApplications.length > 0 && (
              <ul className="session-list">
                {myApplications.map((app) => {
                  const aud = auditions.find((a) => a.id === app.audition_id);
                  return (
                    <li key={app.id} style={{ display: "block" }}>
                      <strong>{aud ? aud.title : "Audition"}</strong>
                      <p style={{ margin: "4px 0 0" }}>{app.message}</p>
                      <span className="muted">
                        {formatDate(app.created_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
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
