// ACTORVERSE — Script Vault (Phase 3)
// Private PDF scripts: upload (PDF only, about 10 MB max), view, download,
// rename, delete. An optional pasted script text can be sent to the
// Teleprompter. Only the signed-in user's own scripts are ever shown.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  deleteMyScript,
  listMyScripts,
  renameMyScript,
  signedScriptUrl,
  uploadScript,
  validateScriptFile,
  MAX_SCRIPT_BYTES,
} from "@/lib/scripts";
import type { ScriptRow } from "@/lib/scripts";
import { showToast } from "@/components/Toast";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ScriptsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [title, setTitle] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "uploading" | "saving"
  >("idle");
  /** Live upload percentage (0–100), or null when the total is unknown. */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedOnce = useRef(false);
  const mountedRef = useRef(true);
  /** Aborts the in-flight upload when the user taps Cancel. */
  const uploadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      uploadAbortRef.current?.abort();
    };
  }, []);

  const refreshList = useCallback(async () => {
    setScripts(await listMyScripts());
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

  function handleFilePicked(picked: File | undefined) {
    if (!picked) return;
    const problem = validateScriptFile(picked);
    if (problem) {
      setMessage(problem);
      setMessageOk(false);
      setFile(null);
      return;
    }
    setFile(picked);
    setMessage(null);
    if (!title.trim()) setTitle(picked.name.replace(/\.pdf$/i, ""));
  }

  async function handleUpload() {
    if (!file) {
      setMessage("Choose a PDF file first.");
      setMessageOk(false);
      return;
    }
    // Stage 1: the file goes up, with a live percentage so a big PDF on
    // a slow connection never looks stuck. The user can cancel, and a
    // stalled upload stops itself with a plain message. Stage 2: the
    // row is saved. The PDF text is read in the background afterwards,
    // so the button never sits on "Uploading…" for minutes on a big PDF.
    // On failure the file, title and text stay put, so retry is one tap.
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setUploadProgress(0);
    setUploadStage("uploading");
    setMessage(null);
    const result = await uploadScript(
      file,
      title,
      scriptText,
      (stage) => setUploadStage(stage),
      {
        signal: controller.signal,
        onProgress: (pct) => {
          if (mountedRef.current) setUploadProgress(pct);
        },
      },
    );
    uploadAbortRef.current = null;
    setUploadStage("idle");
    setUploadProgress(null);
    setMessageOk(result.ok);
    setMessage(result.message);
    if (!result.ok) return;
    showToast("Script uploaded.");
    const savedRow = result.row;
    setFile(null);
    setTitle("");
    setScriptText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await refreshList();
    if (result.extractionDone && savedRow) {
      setExtractingId(savedRow.id);
      const landed = await result.extractionDone;
      if (!mountedRef.current) return;
      setExtractingId(null);
      await refreshList();
      setMessageOk(true);
      setMessage(
        landed
          ? "Script saved. The text was read from the PDF automatically."
          : "Script saved, but the text could not be read from this PDF. Tap it in the Teleprompter to try again.",
      );
    }
  }

  function handleCancelUpload() {
    uploadAbortRef.current?.abort();
  }

  async function handleOpen(row: ScriptRow) {
    setRowBusy(row.id);
    const url = await signedScriptUrl(row.storage_path);
    setRowBusy(null);
    if (!url) {
      setMessage("That PDF could not be opened. Try again.");
      setMessageOk(false);
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  async function handleDownload(row: ScriptRow) {
    setRowBusy(row.id);
    const url = await signedScriptUrl(row.storage_path);
    setRowBusy(null);
    if (!url) {
      setMessage("Download failed. Try again.");
      setMessageOk(false);
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMessage("Download started.");
    setMessageOk(true);
  }

  async function handleRename(row: ScriptRow) {
    setRowBusy(row.id);
    const error = await renameMyScript(row.id, renameValue);
    setRowBusy(null);
    if (error) {
      setMessage(error);
      setMessageOk(false);
      return;
    }
    setRenamingId(null);
    setMessage("Renamed.");
    showToast("Renamed.");
    setMessageOk(true);
    await refreshList();
  }

  async function handleDelete(row: ScriptRow) {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) {
      return;
    }
    setRowBusy(row.id);
    const error = await deleteMyScript(row);
    setRowBusy(null);
    if (error) {
      setMessage(error);
      setMessageOk(false);
      return;
    }
    setMessage("Deleted.");
    setMessageOk(true);
    showToast("Deleted.");
    await refreshList();
  }

  return (
    <section className="section" data-page="scripts">
      <div className="page-head">
        <span className="eyebrow">Private Vault</span>
        <h1>Script Vault</h1>
        <span className="accent-bar" aria-hidden="true"></span>
        <p>
          Your private PDF scripts. Only you can see them. PDF only, up to
          about 10 MB each.
        </p>
      </div>

      {signedIn === false && (
        <p className="note">
          Sign in to use the Script Vault. Your scripts are private to your
          account.
        </p>
      )}

      {signedIn === true && (
        <>
          <div
            className="card card-accent"
            style={
              {
                marginBottom: 14,
                "--card-accent": "#b48cff",
                "--card-soft": "rgba(180, 140, 255, 0.10)",
              } as CSSProperties
            }
          >
            <h3 style={{ marginTop: 0 }}>Upload a script</h3>
            <div className="form">
              <div>
                <label htmlFor="script-file">PDF file</label>
                <input
                  ref={fileInputRef}
                  id="script-file"
                  type="file"
                  className="field"
                  accept="application/pdf,.pdf"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                />
                {file && (
                  <p className="sub" style={{ marginTop: 6 }}>
                    {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
                    (limit {Math.round(MAX_SCRIPT_BYTES / 1024 / 1024)} MB)
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="script-title">Title</label>
                <input
                  id="script-title"
                  type="text"
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Script title"
                />
              </div>
              <div>
                <label htmlFor="script-text">
                  Script text (optional) — paste the words here, or leave it
                  empty and the app will read the text from the PDF itself
                </label>
                <textarea
                  id="script-text"
                  rows={4}
                  className="field"
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste the script text here (optional — otherwise the PDF is read automatically)…"
                />
              </div>
              <button
                type="button"
                className="btn btn-gold"
                disabled={uploadStage !== "idle" || !file}
                onClick={() => void handleUpload()}
              >
                {uploadStage === "uploading" ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Uploading…
                    {uploadProgress !== null ? ` ${uploadProgress}%` : ""}
                  </>
                ) : uploadStage === "saving" ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Saving…
                  </>
                ) : (
                  "Upload script"
                )}
              </button>
              {uploadStage === "uploading" && (
                <>
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={uploadProgress ?? undefined}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Upload progress"
                  >
                    <div
                      className="progress-bar"
                      style={{
                        width: `${uploadProgress ?? 0}%`,
                      }}
                    />
                  </div>
                  <p
                    className="sub"
                    style={{ marginTop: 6, marginBottom: 0 }}
                  >
                    Keep this page open until it says Saved.
                  </p>
                  <button
                    type="button"
                    className="btn btn-line"
                    onClick={handleCancelUpload}
                  >
                    Cancel upload
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="card card-flat">
            <h3 style={{ marginTop: 0 }}>My scripts</h3>
            {scripts.length === 0 && (
              <p className="empty">
                <strong>No scripts yet.</strong>Upload your first PDF above.
              </p>
            )}
            {scripts.length > 0 && (
              <ul className="session-list">
                {scripts.map((row) => (
                  <li key={row.id} style={{ display: "block" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                      }}
                    >
                      <strong>{row.title}</strong>
                      <span className="muted">{formatDate(row.created_at)}</span>
                    </div>
                    {extractingId === row.id && (
                      <p
                        className="sub"
                        style={{ marginTop: 4, marginBottom: 0 }}
                      >
                        <span
                          className="spinner spinner-light"
                          aria-hidden="true"
                        />{" "}
                        Reading text from the PDF…
                      </p>
                    )}
                    {renamingId === row.id ? (
                      <div className="form" style={{ marginTop: 10 }}>
                        <input
                          type="text"
                          className="field"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          placeholder="New title"
                          aria-label="New title"
                        />
                        <div className="rowbtns" style={{ marginTop: 0 }}>
                          <button
                            type="button"
                            className="btn btn-gold"
                            disabled={rowBusy === row.id}
                            onClick={() => void handleRename(row)}
                          >
                            Save name
                          </button>
                          <button
                            type="button"
                            className="btn btn-line"
                            onClick={() => setRenamingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rowbtns">
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={rowBusy === row.id}
                          onClick={() => void handleOpen(row)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={rowBusy === row.id}
                          onClick={() => void handleDownload(row)}
                        >
                          Download
                        </button>
                        <Link
                          href={`/teleprompter?script=${row.id}`}
                          className="btn btn-gold"
                        >
                          Send to Teleprompter
                        </Link>
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={rowBusy === row.id}
                          onClick={() => {
                            setRenamingId(row.id);
                            setRenameValue(row.title);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={rowBusy === row.id}
                          onClick={() => void handleDelete(row)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
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
