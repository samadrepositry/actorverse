// ACTORVERSE — Script Vault (Phase 3)
// Private PDF scripts: upload (PDF only, about 10 MB max), view, download,
// rename, delete. An optional pasted script text can be sent to the
// Teleprompter. Only the signed-in user's own scripts are ever shown.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedOnce = useRef(false);

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
    setUploading(true);
    setMessage(null);
    const result = await uploadScript(file, title, scriptText);
    setMessageOk(result.ok);
    setMessage(result.message);
    setUploading(false);
    if (result.ok) showToast("Script uploaded.");
    if (result.ok) {
      setFile(null);
      setTitle("");
      setScriptText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshList();
    }
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
    <section className="section">
      <h2>Script Vault</h2>
      <p className="sub">
        Your private PDF scripts. Only you can see them. PDF only, up to
        about 10 MB each.
      </p>

      {signedIn === false && (
        <p className="note">
          Sign in to use the Script Vault. Your scripts are private to your
          account.
        </p>
      )}

      {signedIn === true && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>Upload a script</h3>
            <div className="form">
              <div>
                <label htmlFor="script-file">PDF file</label>
                <input
                  ref={fileInputRef}
                  id="script-file"
                  type="file"
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
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste the script text here (optional — otherwise the PDF is read automatically)…"
                />
              </div>
              <button
                type="button"
                className="btn btn-gold"
                disabled={uploading || !file}
                onClick={() => void handleUpload()}
              >
                {uploading ? "Uploading…" : "Upload script"}
              </button>
            </div>
          </div>

          <div className="card">
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
                    {renamingId === row.id ? (
                      <div className="form" style={{ marginTop: 10 }}>
                        <input
                          type="text"
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
                          className="btn btn-line"
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
