// ACTORVERSE — Teleprompter (Phase 2)
// Pick a monologue or paste your own text, then one tap on RECORD starts
// the camera and the script scroll together. A second tap stops and saves
// the take. The take is always downloadable to the phone; signing in also
// saves it online to Studio → My Private Recordings.

"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MONOLOGUES } from "@/data/monologues";
import { useRecorder, formatClock } from "@/lib/useRecorder";
import { downloadBlob } from "@/lib/recorder";
import type { ShotSize } from "@/lib/recorder";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { uploadTake } from "@/lib/recordings";
import { getMyScript, listMyScripts, type ScriptRow } from "@/lib/scripts";
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

function TeleprompterPageInner() {
  const searchParams = useSearchParams();
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
  } = rec;

  const [monologueId, setMonologueId] = useState(MONOLOGUES[0].id);
  const [ownText, setOwnText] = useState("");
  const [useOwn, setUseOwn] = useState(false);
  const [speed, setSpeed] = useState(40); // pixels per second, 10-120
  const [fontSize, setFontSize] = useState(28);
  const [picture, setPicture] = useState<string | null>(null);
  const [title, setTitle] = useState(MONOLOGUES[0].title);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [source, setSource] = useState<
    "paste" | "pdfs" | "scan" | "monologues"
  >("paste");
  const [pdfs, setPdfs] = useState<ScriptRow[] | null>(null);
  const [pdfsLoading, setPdfsLoading] = useState(false);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [pdfNote, setPdfNote] = useState<string | null>(null);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanNotice, setScanNotice] = useState(false);

  const scriptRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const script = useOwn
    ? ownText
    : (MONOLOGUES.find((m) => m.id === monologueId)?.text ?? "");

  // Check sign-in once, to explain whether a take can be saved online.
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
        if (!cancelled) setSignedIn(Boolean(user));
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep links: ?monologue=<id> from the Monologues page, or
  // ?script=<id> from the Script Vault (loads the saved script text).
  useEffect(() => {
    const monoId = searchParams.get("monologue");
    if (monoId) {
      const m = MONOLOGUES.find((x) => x.id === monoId);
      if (m) {
        setSource("monologues");
        pickMonologue(m.id, m.title);
      }
      return;
    }
    const scriptId = searchParams.get("script");
    if (scriptId) {
      setSource("pdfs");
      setSelectedPdfId(scriptId);
      void loadPdfs();
      let cancelled = false;
      (async () => {
        const row = await getMyScript(scriptId);
        if (!cancelled && row?.script_text) {
          setUseOwn(true);
          setOwnText(row.script_text);
          setTitle(row.title);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [searchParams]);

  // Scroll the script while recording, at the chosen speed.
  useEffect(() => {
    if (!recording) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const el = scriptRef.current;
      if (el) el.scrollTop += speedRef.current * dt;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [recording]);

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

  // Reset the script scroll when the script changes.
  useEffect(() => {
    if (scriptRef.current) scriptRef.current.scrollTop = 0;
  }, [monologueId, useOwn, source]);

  function pickMonologue(id: string, mTitle: string) {
    setMonologueId(id);
    setUseOwn(false);
    setTitle(mTitle);
    setSaveMessage(null);
  }

  /** Load the signed-in user's saved PDF scripts (Script Vault). */
  async function loadPdfs() {
    if (pdfs !== null || pdfsLoading) return;
    setPdfsLoading(true);
    const rows = await listMyScripts();
    setPdfs(rows);
    setPdfsLoading(false);
  }

  /** Tap a saved PDF: load its saved text into the Teleprompter. */
  function pickPdf(row: ScriptRow) {
    setSelectedPdfId(row.id);
    if (row.script_text?.trim()) {
      setOwnText(row.script_text);
      setUseOwn(true);
      setTitle(row.title);
      setPdfNote(null);
      setSaveMessage(null);
    } else {
      setPdfNote(
        "This PDF has no typed text saved. Open it in Scripts and add the text, or paste the text in the Paste script tab.",
      );
    }
  }

  /** Scan a photographed or uploaded page into the editable text box. */
  async function handleScanFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setScanStatus("That file is not a picture. Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setScanImage(dataUrl);
      setScanNotice(false);
      setScanBusy(true);
      setScanStatus("Reading the page…");
      try {
        const Tesseract = (await import("tesseract.js")).default;
        const result = await Tesseract.recognize(dataUrl, "eng+urd", {
          logger: (m) => {
            if (
              m.status === "recognizing text" &&
              typeof m.progress === "number"
            ) {
              setScanStatus(
                `Reading the page… ${Math.round(m.progress * 100)}%`,
              );
            }
          },
        });
        const text = (result?.data?.text ?? "").trim();
        if (!text) throw new Error("No text found on the page.");
        setOwnText(text);
        setUseOwn(true);
        setTitle("Scanned page");
        setScanNotice(true);
        setScanStatus("Page read. Check the words below, then press RECORD.");
        setTakeError(null);
      } catch {
        // Never fake a transcription: pin the photo as a picture prompt
        // and ask for the text to be typed or pasted instead.
        setPicture(dataUrl);
        setScanNotice(false);
        setScanStatus(
          "Scanning did not work on this photo. The photo is pinned as a picture prompt above the camera — please type or paste the text in the Paste script tab instead.",
        );
      } finally {
        setScanBusy(false);
      }
    };
    reader.onerror = () => {
      setScanStatus("That picture could not be read. Try another image.");
    };
    reader.readAsDataURL(file);
  }

  function handlePictureFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setTakeError("That file is not a picture. Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPicture(String(reader.result));
      setTakeError(null);
    };
    reader.onerror = () => {
      setTakeError("That picture could not be read. Try another image.");
    };
    reader.readAsDataURL(file);
  }

  async function handleRecordToggle() {
    setSaveMessage(null);
    setSaveOk(false);
    if (recording) {
      await stopRecording();
      return;
    }
    if (!script.trim()) {
      setTakeError("Pick a script, paste your text, or scan a page first.");
      return;
    }
    if (!cameraOn) {
      const opened = await openCamera(facing, shot);
      if (!opened) return;
    }
    await startRecording();
  }

  async function handleSaveOnline() {
    if (!lastTake) return;
    setSaving(true);
    setSaveMessage(null);
    const result = await uploadTake(lastTake, title);
    setSaveOk(result.ok);
    setSaveMessage(result.message);
    setSaving(false);
    if (result.ok) showToast("Take saved to Studio.");
  }

  function handleSaveToPhone() {
    if (!lastTake) return;
    downloadBlob(lastTake.blob, takeFilename(title, lastTake.extension));
    setSaveOk(true);
    setSaveMessage("Saved to your phone. Check your downloads or gallery.");
    showToast("Saved to your phone.");
  }

  return (
    <section className="section">
      <h2>Teleprompter</h2>
      <p className="sub">
        Read your script while the camera records. One tap starts the camera
        and the scroll together.
      </p>

      <p className="step-strip">
        <span><b>1</b> Pick a script</span>
        <span><b>2</b> Open the camera</span>
        <span><b>3</b> Press RECORD</span>
      </p>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>1. Pick a script</h3>
        <div className="source-tabs" role="group" aria-label="Script source">
          <button
            type="button"
            className="source-tab"
            aria-pressed={source === "paste"}
            onClick={() => {
              setSource("paste");
              setUseOwn(true);
              setTitle("My take");
              setSaveMessage(null);
            }}
          >
            Paste script
          </button>
          <button
            type="button"
            className="source-tab"
            aria-pressed={source === "pdfs"}
            onClick={() => {
              setSource("pdfs");
              void loadPdfs();
            }}
          >
            My PDFs
          </button>
          <button
            type="button"
            className="source-tab"
            aria-pressed={source === "scan"}
            onClick={() => setSource("scan")}
          >
            Scan a page
          </button>
          <button
            type="button"
            className="source-tab"
            aria-pressed={source === "monologues"}
            onClick={() => setSource("monologues")}
          >
            Monologues
          </button>
        </div>

        {source === "paste" && (
          <div className="form">
            <label htmlFor="own-script">Paste your own script</label>
            <textarea
              id="own-script"
              dir="auto"
              rows={8}
              value={ownText}
              onChange={(e) => setOwnText(e.target.value)}
              placeholder="Paste or type your script here — Urdu or English"
            />
            <p className="sub" style={{ marginBottom: 0 }}>
              {ownText.trim()
                ? `${ownText.trim().split(/\s+/).length} words — this is the text that will scroll when you press RECORD.`
                : "Type or paste in Urdu or English. Urdu types right-to-left automatically."}
            </p>
          </div>
        )}

        {source === "pdfs" && (
          <div>
            {signedIn === false ? (
              <p className="sub" style={{ marginBottom: 0 }}>
                Sign in to see your PDFs.
              </p>
            ) : pdfsLoading ? (
              <p className="sub" style={{ marginBottom: 0 }}>
                Loading your PDFs…
              </p>
            ) : pdfs && pdfs.length === 0 ? (
              <p className="sub" style={{ marginBottom: 0 }}>
                No PDFs yet — upload one in{" "}
                <a href="/scripts">Scripts</a>.
              </p>
            ) : (
              <div
                className="filters"
                role="group"
                aria-label="My PDF scripts"
                style={{ marginBottom: 0 }}
              >
                {(pdfs ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="fbtn"
                    aria-pressed={selectedPdfId === p.id}
                    onClick={() => pickPdf(p)}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
            {pdfNote && (
              <p className="note" role="status" style={{ marginTop: 12 }}>
                {pdfNote}
              </p>
            )}
          </div>
        )}

        {source === "scan" && (
          <div>
            <div className="rowbtns" style={{ marginTop: 0 }}>
              <label className="btn btn-gold" htmlFor="scan-camera">
                Take a photo
              </label>
              <input
                id="scan-camera"
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => void handleScanFile(e.target.files?.[0])}
              />
              <label className="btn btn-line" htmlFor="scan-upload">
                Upload an image
              </label>
              <input
                id="scan-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => void handleScanFile(e.target.files?.[0])}
              />
            </div>
            {scanImage && (
              <img
                src={scanImage}
                alt="Scanned page"
                className="scan-preview"
              />
            )}
            {scanStatus && (
              <p
                className="sub"
                role="status"
                style={{ marginTop: 12, marginBottom: 0 }}
              >
                {scanStatus}
              </p>
            )}
            {scanNotice && (
              <div className="form" style={{ marginTop: 12 }}>
                <p className="note" style={{ marginTop: 0 }}>
                  <strong>
                    Check the words — fix any wrong words before recording.
                  </strong>{" "}
                  The scan can misread handwriting, so read the text below and
                  correct it.
                </p>
                <label htmlFor="scanned-script">
                  Scanned text (you can edit it)
                </label>
                <textarea
                  id="scanned-script"
                  dir="auto"
                  rows={6}
                  value={ownText}
                  onChange={(e) => setOwnText(e.target.value)}
                  placeholder="Scanned text will appear here…"
                />
              </div>
            )}
          </div>
        )}

        {source === "monologues" && (
          <div>
            <div
              className="filters"
              role="group"
              aria-label="Monologues"
              style={{ marginBottom: 0 }}
            >
              {MONOLOGUES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="fbtn"
                  aria-pressed={!useOwn && monologueId === m.id}
                  onClick={() => pickMonologue(m.id, m.title)}
                >
                  {m.title}
                </button>
              ))}
            </div>
            <p className="sub" style={{ marginBottom: 0, marginTop: 12 }}>
              {MONOLOGUES.find((m) => m.id === monologueId)?.character}
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>2. Camera and shot</h3>
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
                {cameraBusy ? "Opening camera…" : "Open camera"}
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
              {picture && (
                <img
                  src={picture}
                  alt="Picture prompt"
                  className="picture-prompt"
                />
              )}
            </>
          )}
        </div>

        <div className="form" style={{ marginTop: 12 }}>
          <label htmlFor="picture-prompt">
            Picture prompt (optional) — a picture pinned over the camera view
            while you perform
          </label>
          <div className="rowbtns" style={{ marginTop: 0 }}>
            <label className="btn btn-line" htmlFor="picture-file">
              Choose a picture
            </label>
            <input
              id="picture-file"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handlePictureFile(e.target.files?.[0])}
            />
            {picture && (
              <button
                type="button"
                className="btn btn-line"
                onClick={() => setPicture(null)}
              >
                Remove picture
              </button>
            )}
          </div>
        </div>

        {cameraError && (
          <p className="error" role="alert" style={{ marginTop: 12 }}>
            {cameraError}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>3. Script</h3>
        <div className="slider-row">
          <label htmlFor="speed">
            Scroll speed: {speed} px per second
          </label>
          <input
            id="speed"
            type="range"
            min={10}
            max={120}
            step={5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </div>
        <div className="rowbtns" style={{ marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-line"
            onClick={() => setFontSize((f) => Math.max(20, f - 4))}
          >
            A− Smaller text
          </button>
          <button
            type="button"
            className="btn btn-line"
            onClick={() => setFontSize((f) => Math.min(44, f + 4))}
          >
            A+ Bigger text
          </button>
        </div>
        <div
          ref={scriptRef}
          className="tele-script"
          style={{ fontSize: `${fontSize}px` }}
        >
          {script.trim()
            ? script
            : "Pick a script, paste your text, or scan a page."}
        </div>
      </div>

      <button
        type="button"
        className="record-btn"
        disabled={cameraBusy}
        onClick={() => void handleRecordToggle()}
      >
        {recording
          ? `■ STOP & SAVE (${formatClock(seconds)})`
          : cameraOn
            ? "● RECORD"
            : "● RECORD — opens the camera"}
      </button>
      {recording && (
        <p className="sub" style={{ textAlign: "center", marginTop: 8 }}>
          Recording… read your script. Tap STOP &amp; SAVE when you finish.
        </p>
      )}
      {takeError && (
        <p className="error" role="alert" style={{ textAlign: "center" }}>
          {takeError}
        </p>
      )}

      {lastTake && takeUrl && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Your take — {formatClock(lastTake.durationSeconds)}</h3>
          <video
            className="take-video"
            src={takeUrl}
            controls
            playsInline
            preload="metadata"
          />
          <div className="form" style={{ marginTop: 12 }}>
            <label htmlFor="take-title">Title for this take</label>
            <input
              id="take-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Take title"
            />
          </div>
          <div className="rowbtns">
            <button
              type="button"
              className="btn btn-gold"
              disabled={saving}
              onClick={() => void handleSaveOnline()}
            >
              {saving ? "Saving…" : "Save online"}
            </button>
            <button
              type="button"
              className="btn btn-dark"
              onClick={handleSaveToPhone}
            >
              Save to phone
            </button>
          </div>
          {saveMessage && (
            <p
              className={saveOk ? "success" : "error"}
              role="status"
              style={{ marginTop: 12 }}
            >
              {saveMessage}
            </p>
          )}
          {signedIn === false && (
            <p className="note">
              You are not signed in — this take can be saved to your phone,
              but sign in to keep it online in Studio.
            </p>
          )}
        </div>
      )}

      <p className="note">
        <strong>About saving:</strong> the web app saves to your phone with
        the Save to phone button (a download). True automatic saving to the
        gallery only exists in a native app.
      </p>
    </section>
  );
}

export default function TeleprompterPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <h2>Teleprompter</h2>
          <p className="sub">Loading…</p>
        </section>
      }
    >
      <TeleprompterPageInner />
    </Suspense>
  );
}
