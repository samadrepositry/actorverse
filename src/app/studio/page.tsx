// ACTORVERSE — Studio (Phase 2)
// Camera Studio: open the camera, pick a shot, record a take. Below it,
// My Private Recordings: the signed-in user's saved takes, each with Play,
// Save to phone (download) and Delete. Nothing here is shared with anyone
// else — every take is private to its owner.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder, formatClock } from "@/lib/useRecorder";
import { downloadBlob, downloadFromUrl } from "@/lib/recorder";
import type { ShotSize, Take } from "@/lib/recorder";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  deleteMyRecording,
  listMyRecordings,
  signedTakeUrl,
  uploadTake,
} from "@/lib/recordings";
import type { RecordingRow, UploadResult } from "@/lib/recordings";
import { showToast } from "@/components/Toast";

const SHOTS: { id: ShotSize; label: string; hint: string }[] = [
  { id: "wide", label: "Wide Shot", hint: "Full body, head to feet" },
  { id: "medium", label: "Medium Shot", hint: "Shoulders up" },
  { id: "closeup", label: "Close-up", hint: "Face, large and close" },
];

function takeFilename(title: string, extension: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `actorverse-${slug || "take"}-${Date.now()}.${extension}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function StudioPage() {
  const rec = useRecorder();
  const {
    videoRef,
    cameraOn,
    cameraBusy,
    cameraError,
    shot,
    facing,
    recording,
    seconds,
    lastTake,
    takeError,
    setTakeError,
    openCamera,
    changeShot,
    toggleFacing,
    startRecording,
    stopRecording,
    clearTake,
  } = rec;

  const [title, setTitle] = useState("Studio take");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageKind, setSaveMessageKind] = useState<
    "info" | "success" | "error"
  >("info");
  // Auto-save of the finished take: "idle" before the first take,
  // "saving" while the upload runs, "saved" or "failed" after it lands.
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [listNote, setListNote] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const loadedOnce = useRef(false);
  // Auto-save bookkeeping: the Studio row of the current take (once the
  // upload lands), a sequence number per take, a delete request for a
  // take whose upload was still in flight when Delete was tapped, and
  // the last take already handed to the auto-save.
  const savedRowRef = useRef<{ seq: number; row: RecordingRow } | null>(null);
  const takeSeqRef = useRef(0);
  const deletePendingSeqRef = useRef<number | null>(null);
  const lastTakeHandledRef = useRef<Take | null>(null);

  const refreshList = useCallback(async () => {
    const rows = await listMyRecordings();
    setRecordings(rows);
  }, []);

  // Check sign-in once, then load the user's saved takes.
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

  // Playback URL for the finished take.
  useEffect(() => {
    if (!lastTake) {
      setTakeUrl(null);
      return;
    }
    const url = URL.createObjectURL(lastTake.blob);
    setTakeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [lastTake]);

  async function handleRecordToggle() {
    setSaveMessage(null);
    if (recording) {
      await stopRecording();
      return;
    }
    if (!cameraOn) {
      const opened = await openCamera(facing, shot);
      if (!opened) return;
    }
    await startRecording();
  }

  /**
   * Apply one upload result. A take deleted while its upload was in
   * flight must never remain in Studio, so a landed row for a deleted
   * take is removed at once. A result for an older take (a new take is
   * already on screen) never touches the new take's status.
   */
  function applySaveResult(result: UploadResult, seq: number) {
    if (deletePendingSeqRef.current === seq) {
      deletePendingSeqRef.current = null;
      if (result.ok && result.row) {
        void deleteMyRecording(result.row);
      }
      return;
    }
    if (seq !== takeSeqRef.current) return;
    setSaving(false);
    if (result.ok) {
      if (result.row) savedRowRef.current = { seq, row: result.row };
      setSaveState("saved");
      setSaveMessage("Saved to Studio.");
      setSaveMessageKind("success");
      showToast("Take saved to Studio.");
      void refreshList();
    } else {
      setSaveState("failed");
      setSaveMessage(
        "Could not save online — your take is still here. Tap Save to phone to keep it.",
      );
      setSaveMessageKind("error");
    }
  }

  /** Save one finished take to Studio in the background. */
  async function saveTakeOnline(take: Take, seq: number) {
    if (seq === takeSeqRef.current) {
      setSaving(true);
      setSaveState("saving");
      setSaveMessage("Saving to Studio…");
      setSaveMessageKind("info");
    }
    const result = await uploadTake(take, title);
    applySaveResult(result, seq);
  }

  /**
   * A finished take saves itself to Studio — every stop path, including
   * the 10-minute auto-stop. The title used is the one set when the
   * take stopped.
   */
  useEffect(() => {
    if (!lastTake || lastTakeHandledRef.current === lastTake) return;
    lastTakeHandledRef.current = lastTake;
    takeSeqRef.current += 1;
    const seq = takeSeqRef.current;
    savedRowRef.current = null;
    setSaveState("idle");
    setSaveMessage(null);
    void saveTakeOnline(lastTake, seq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTake]);

  /** "Try again" after a failed auto-save. */
  async function retrySaveOnline() {
    if (!lastTake || saving) return;
    const seq = takeSeqRef.current;
    setSaving(true);
    setSaveState("saving");
    setSaveMessage("Saving to Studio…");
    setSaveMessageKind("info");
    const result = await uploadTake(lastTake, title);
    applySaveResult(result, seq);
  }

  /** Delete this take: confirm first, remove it from Studio too. */
  async function handleDeleteTake() {
    if (!lastTake) return;
    if (!window.confirm("Delete this take? This cannot be undone.")) return;
    const seq = takeSeqRef.current;
    const saved = savedRowRef.current;
    if (saved && saved.seq === seq) {
      savedRowRef.current = null;
      const error = await deleteMyRecording(saved.row);
      clearTake();
      setTakeError(null);
      setSaveState("idle");
      setSaveMessage(null);
      if (error) {
        showToast(
          "Take deleted here, but it could not be removed from Studio. Delete it there.",
        );
        return;
      }
      void refreshList();
    } else {
      // Upload still in flight (or not yet started): the row is deleted
      // as soon as the upload lands — see applySaveResult.
      deletePendingSeqRef.current = seq;
      clearTake();
      setTakeError(null);
      setSaveState("idle");
      setSaveMessage(null);
    }
    showToast("Take deleted.");
  }

  function handleSaveToPhone() {
    if (!lastTake) return;
    downloadBlob(lastTake.blob, takeFilename(title, lastTake.extension));
    setSaveMessage("Saved to your phone. Check your downloads or gallery.");
    setSaveMessageKind("success");
    showToast("Saved to your phone.");
  }

  async function handlePlay(row: RecordingRow) {
    if (playingId === row.id) {
      setPlayingId(null);
      setPlayingUrl(null);
      return;
    }
    setRowBusy(row.id);
    setListNote(null);
    const url = await signedTakeUrl(row.storage_path);
    setRowBusy(null);
    if (!url) {
      setListNote(
        "That video could not be opened. Check your connection and try again.",
      );
      return;
    }
    setPlayingId(row.id);
    setPlayingUrl(url);
  }

  async function handleDownloadSaved(row: RecordingRow) {
    setRowBusy(row.id);
    setListNote(null);
    try {
      const url = await signedTakeUrl(row.storage_path);
      if (!url) throw new Error("Could not open the video.");
      const ext = row.storage_path.split(".").pop() || "mp4";
      await downloadFromUrl(url, takeFilename(row.title, ext));
      setListNote("Saved to your phone. Check your downloads or gallery.");
      showToast("Saved to your phone.");
    } catch {
      setListNote("Download failed. Check your connection and try again.");
    } finally {
      setRowBusy(null);
    }
  }

  async function handleDelete(row: RecordingRow) {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) {
      return;
    }
    setRowBusy(row.id);
    setListNote(null);
    const error = await deleteMyRecording(row);
    setRowBusy(null);
    if (error) {
      setListNote(error);
      return;
    }
    if (playingId === row.id) {
      setPlayingId(null);
      setPlayingUrl(null);
    }
    setRecordings((prev) => prev.filter((r) => r.id !== row.id));
    showToast("Take deleted.");
  }

  return (
    <section className="section" data-page="studio">
      <h2>Studio</h2>
      <p className="sub">
        Record in front of the camera, then keep your takes here. Only you
        can see them.
      </p>

      <p className="step-strip">
        <span><b>1</b> Open the camera</span>
        <span><b>2</b> Press RECORD</span>
        <span><b>3</b> Stop &amp; save</span>
      </p>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Camera Studio</h3>
        <div className="shot-row" role="group" aria-label="Shot size">
          {SHOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="fbtn"
              aria-pressed={shot === s.id}
              disabled={recording}
              onClick={() => void changeShot(s.id)}
              title={s.hint}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className="fbtn"
            disabled={recording}
            onClick={() => void toggleFacing()}
          >
            {facing === "user" ? "Front camera" : "Back camera"} — switch
          </button>
        </div>
        <p className="sub" style={{ marginBottom: 8 }}>
          {shot === "wide"
            ? "Wide Shot: full body, head to feet. Put the phone 2–3 metres away so your feet are visible."
            : shot === "medium"
              ? "Medium Shot: shoulders up."
              : "Close-up: your face, large and close."}
        </p>

        <div className="video-wrap">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ transform: `scale(${rec.previewScale})` }}
          />
          {!cameraOn && (
            <div className="video-empty">
              <p>Camera is off.</p>
              <button
                type="button"
                className="btn btn-gold"
                disabled={cameraBusy || recording}
                onClick={() => void openCamera(facing, shot)}
              >
                {cameraBusy ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Opening
                    camera…
                  </>
                ) : (
                  "Open camera"
                )}
              </button>
            </div>
          )}
          {cameraOn && (
            <>
              <div className="guide-line" style={{ top: "8%" }}>
                <span>HEAD</span>
              </div>
              {shot === "wide" && (
                <div className="guide-line" style={{ top: "92%" }}>
                  <span>FEET</span>
                </div>
              )}
              {shot === "medium" && (
                <div className="guide-line" style={{ top: "72%" }}>
                  <span>SHOULDERS</span>
                </div>
              )}
              {shot === "closeup" && (
                <div className="guide-face">
                  <span>FACE</span>
                </div>
              )}
              {recording && (
                <div className="rec-badge">
                  <span className="rec-dot" /> REC {formatClock(seconds)}
                </div>
              )}
            </>
          )}
        </div>

        {cameraError && (
          <p className="error" role="alert" style={{ marginTop: 12 }}>
            {cameraError}
          </p>
        )}

        <button
          type="button"
          className={"record-btn" + (recording ? " recording" : "")}
          disabled={cameraBusy}
          onClick={() => void handleRecordToggle()}
          style={{ marginTop: 14 }}
        >
          {recording
            ? `■ STOP & SAVE (${formatClock(seconds)})`
            : cameraOn
              ? "● RECORD"
              : "● RECORD — opens the camera"}
        </button>
        {recording && (
          <p className="sub" style={{ textAlign: "center", marginTop: 8 }}>
            Recording… tap STOP &amp; SAVE when you finish.
          </p>
        )}
        {takeError && (
          <p className="error" role="alert" style={{ textAlign: "center" }}>
            {takeError}
          </p>
        )}

        {lastTake && takeUrl && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>
              Your take — {formatClock(lastTake.durationSeconds)}
            </h3>
            <video
              className="take-video"
              src={takeUrl}
              controls
              playsInline
              preload="metadata"
            />
            <div className="form" style={{ marginTop: 12 }}>
              <label htmlFor="studio-take-title">Title for this take</label>
              <input
                id="studio-take-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Take title"
              />
            </div>
            <div className="rowbtns">
              <button
                type="button"
                className="btn btn-dark"
                onClick={handleSaveToPhone}
              >
                Save to phone
              </button>
              <button
                type="button"
                className="btn btn-line"
                onClick={() => void handleDeleteTake()}
              >
                Delete
              </button>
            </div>
            {saveMessage && (
              <p
                className={
                  saveMessageKind === "error"
                    ? "error"
                    : saveMessageKind === "success"
                      ? "success"
                      : "sub"
                }
                role="status"
                style={{ marginTop: 12 }}
              >
                {saveMessage}
              </p>
            )}
            {saveState === "failed" && lastTake && !lastTake.tooLarge && (
              <button
                type="button"
                className="btn btn-line"
                disabled={saving}
                onClick={() => void retrySaveOnline()}
                style={{ marginTop: 8 }}
              >
                Try again
              </button>
            )}
            {signedIn === false && (
              <p className="note">
                You are not signed in — this take can be saved to your phone,
                but sign in to keep it online in Studio.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>My Private Recordings</h3>
        {signedIn === false && (
          <p className="note">
            Sign in to see your saved takes here. Takes you save to your phone
            stay on your device.
          </p>
        )}
        {signedIn === true && recordings.length === 0 && (
          <p className="empty"><strong>No saved takes yet.</strong>Record one above — it saves to Studio automatically.</p>
        )}
        {signedIn === true && recordings.length > 0 && (
          <ul className="session-list">
            {recordings.map((row) => (
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
                  <span className="muted">
                    {formatClock(row.duration_seconds)} · {formatDate(row.created_at)}
                  </span>
                </div>
                {playingId === row.id && playingUrl && (
                  <video
                    className="take-video"
                    src={playingUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    style={{ marginTop: 10 }}
                  />
                )}
                <div className="rowbtns">
                  <button
                    type="button"
                    className="btn btn-line"
                    disabled={rowBusy === row.id}
                    onClick={() => void handlePlay(row)}
                  >
                    {playingId === row.id ? "Hide" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-line"
                    disabled={rowBusy === row.id}
                    onClick={() => void handleDownloadSaved(row)}
                  >
                    Save to phone
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
              </li>
            ))}
          </ul>
        )}
        {listNote && (
          <p className="note" role="status" style={{ marginTop: 12 }}>
            {listNote}
          </p>
        )}
      </div>

      <p className="note">
        <strong>About saving:</strong> your take saves itself to Studio
        when you stop recording. Save to phone downloads it to your
        gallery — true automatic saving to the gallery only exists in a
        native app.
      </p>
    </section>
  );
}
