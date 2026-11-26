// ACTORVERSE — Teleprompter (Phase 2)
// Pick a monologue, paste your own text, tap one of your PDFs (its words
// are read out of the PDF and put straight in the reading box), or scan
// a page — then one tap on RECORD starts the camera and the script
// scroll together. A second tap stops and saves the take. The take is
// always downloadable to the phone; signing in also saves it online to
// Studio → My Private Recordings.

"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MONOLOGUES } from "@/data/monologues";
import { useRecorder, formatClock } from "@/lib/useRecorder";
import { downloadBlob } from "@/lib/recorder";
import type { ShotSize } from "@/lib/recorder";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { uploadTake } from "@/lib/recordings";
import {
  getMyScript,
  listMyScripts,
  saveScriptText,
  signedScriptUrl,
  type ScriptRow,
} from "@/lib/scripts";
import { extractPdfTextFromUrl } from "@/lib/pdfText";
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
  const [pdfBusy, setPdfBusy] = useState(false);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanNotice, setScanNotice] = useState(false);

  const scriptRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  // Cleaned photo (grayscale, contrast-stretched) ready for either scan
  // path. The raw photo stays in scanImage for the preview.
  const scanOcrRef = useRef<string | null>(null);

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
  // ?script=<id> from the Script Vault (reads the PDF's text into the
  // reading box — saved text if there is any, otherwise straight out of
  // the PDF file itself).
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
        if (!cancelled && row) void pickPdf(row);
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

  /**
   * Tap a saved PDF: its words go straight into the reading box.
   * Saved text (pasted at upload, or read from the PDF before) loads
   * instantly. Otherwise the text is read out of the PDF file itself
   * in the browser, then saved back so the next tap is instant.
   */
  async function pickPdf(row: ScriptRow) {
    if (pdfBusy) return;
    setSelectedPdfId(row.id);
    setSaveMessage(null);
    if (row.script_text?.trim()) {
      setOwnText(row.script_text);
      setUseOwn(true);
      setTitle(row.title);
      setPdfNote(null);
      return;
    }
    setPdfBusy(true);
    setPdfNote("PDF text nikaal raha hoon…");
    try {
      const url = await signedScriptUrl(row.storage_path);
      if (!url) throw new Error("Could not open the PDF.");
      const text = await extractPdfTextFromUrl(url);
      if (!text) {
        setPdfNote(
          "Is PDF mein readable text nahi hai — ye scanned photo lagti hai. 'Scan a page' se photo lo.",
        );
        return;
      }
      setOwnText(text);
      setUseOwn(true);
      setTitle(row.title);
      setPdfNote(null);
      // Save it back so the next tap is instant.
      const saved = await saveScriptText(row.id, text);
      if (saved) {
        setPdfs((prev) =>
          prev?.map((p) =>
            p.id === row.id ? { ...p, script_text: text } : p,
          ) ?? null,
        );
      }
    } catch {
      setPdfNote(
        "PDF text nahi nikaal saka. Dobara try karein, ya Paste script tab mein text paste karein.",
      );
    } finally {
      setPdfBusy(false);
    }
  }

  /**
   * Clean a phone photo before OCR: downscale to max ~2000 px wide,
   * grayscale, and a contrast stretch (1st–99th percentile) so shadows
   * and uneven light hurt less. Plain canvas 2D, no new dependencies.
   * If cleanup fails for any reason the caller falls back to the raw
   * photo — the scan never dies because of the cleanup.
   */
  async function cleanPhotoForOcr(dataUrl: string): Promise<string> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read the photo."));
      el.src = dataUrl;
    });
    const MAX_W = 2000;
    const scale = Math.min(1, MAX_W / img.naturalWidth);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const total = w * h;
    const grey = new Uint8Array(total);
    const hist = new Uint32Array(256);
    for (let i = 0; i < total; i++) {
      const g = Math.round(
        0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2],
      );
      grey[i] = g;
      hist[g]++;
    }
    // Stretch between the 1st and 99th percentile so a dark shadow or a
    // bright glare does not flatten the whole page.
    const edge = total * 0.01;
    let lo = 0;
    let hi = 255;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= edge) {
        lo = v;
        break;
      }
    }
    acc = 0;
    for (let v = 255; v >= 0; v--) {
      acc += hist[v];
      if (acc >= edge) {
        hi = v;
        break;
      }
    }
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < total; i++) {
      const v = Math.round(((grey[i] - lo) / range) * 255);
      const c = v < 0 ? 0 : v > 255 ? 255 : v;
      d[i * 4] = c;
      d[i * 4 + 1] = c;
      d[i * 4 + 2] = c;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  }

  /**
   * Shrink a photo to a small JPEG for the AI scan, so the upload stays
   * well under the server's size limit. Falls back to the input image
   * when the conversion fails.
   */
  async function toJpegForAi(dataUrl: string): Promise<string> {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not read the photo."));
        el.src = dataUrl;
      });
      const MAX_W = 1600;
      const scale = Math.min(1, MAX_W / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return dataUrl;
    }
  }

  /**
   * Take or upload a page photo: the photo is shown and the user picks
   * how to read it — AI scan (best reading) or the phone scan (free, on
   * this phone). Nothing is read until the user picks one.
   */
  async function handleScanFile(file: File | undefined) {
    if (!file || scanBusy) return;
    if (!file.type.startsWith("image/")) {
      setScanStatus("That file is not a picture. Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setScanImage(dataUrl);
      setScanNotice(false);
      setScanStatus("Photo ready — choose how to read it.");
      // Clean the photo once (raw phone shots carry shadows and uneven
      // light); if cleanup fails, both scan paths use the raw photo.
      try {
        scanOcrRef.current = await cleanPhotoForOcr(dataUrl);
      } catch {
        scanOcrRef.current = dataUrl;
      }
    };
    reader.onerror = () => {
      setScanStatus("That picture could not be read. Try another image.");
    };
    reader.readAsDataURL(file);
  }

  /** AI scan: Gemini reads the words on the staged photo. */
  async function handleAiScan() {
    if (scanBusy || !scanImage) return;
    setScanBusy(true);
    setScanNotice(false);
    setScanStatus("AI is reading the page…");
    try {
      const payload = await toJpegForAi(scanOcrRef.current ?? scanImage);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: payload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setScanStatus("AI scan did not work — try the phone scan below.");
        return;
      }
      const text = String(data.text ?? "").trim();
      if (!text) {
        setScanStatus(
          "AI scan found no words on this page. Try a clearer photo, or use the phone scan below.",
        );
        return;
      }
      setOwnText(text);
      setUseOwn(true);
      setTitle("Scanned page");
      setScanNotice(true);
      setScanStatus("Page read. Check the words below, then press RECORD.");
      setTakeError(null);
    } catch {
      setScanStatus("AI scan did not work — try the phone scan below.");
    } finally {
      setScanBusy(false);
    }
  }

  /** Phone scan: tesseract reads the staged photo on this phone (free). */
  async function handlePhoneScan() {
    if (scanBusy || !scanImage) return;
    setScanBusy(true);
    setScanNotice(false);
    setScanStatus("Reading the page…");
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const ocrUrl = scanOcrRef.current ?? scanImage;
      // Two separate passes — never one mixed "eng+urd" pass (that is
        // what mixed Latin junk into the Urdu). Each pass reads the
        // cleaned photo in one language with PSM 6 (one dense block of
        // text — a novel page). The pass with the stronger read wins and
        // ONLY its text is shown; the other pass's output is discarded.
        // Score = total word confidence (mean confidence × word count):
        // a real read has many confident words, a wrong-language pass
        // has few, low-confidence guesses. A page that mixes Urdu AND
        // English in the same text will only get its dominant language
        // read well — pure Urdu and pure English pages both work.
        async function ocrPass(
          lang: "urd" | "eng",
          progressBase: number,
        ): Promise<{ text: string; score: number }> {
          const worker = await Tesseract.createWorker(lang, undefined, {
            logger: (m) => {
              if (
                m.status === "recognizing text" &&
                typeof m.progress === "number"
              ) {
                setScanStatus(
                  `Reading the page… ${Math.round(
                    progressBase + m.progress * 50,
                  )}%`,
                );
              }
            },
          });
          try {
            await worker.setParameters({
              tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
            });
            const result = await worker.recognize(ocrUrl);
            const text = (result?.data?.text ?? "").trim();
            const words = result?.data?.words ?? [];
            let score = 0;
            for (const w of words) {
              score += typeof w.confidence === "number" ? w.confidence : 0;
            }
            return { text, score };
          } finally {
            try {
              await worker.terminate();
            } catch {
              // Worker cleanup failure is not a scan failure.
            }
          }
        }
        const urduPass = await ocrPass("urd", 0);
        const englishPass = await ocrPass("eng", 50);
        const best =
          englishPass.score > urduPass.score ? englishPass : urduPass;
        const text = best.text;
        if (!text) throw new Error("No text found on the page.");
        setOwnText(text);
        setUseOwn(true);
        setTitle("Scanned page");
        setScanNotice(true);
        setScanStatus(
          "Page read. Check the words below, then press RECORD.",
        );
        setTakeError(null);
      } catch {
        // Never fake a transcription: pin the photo as a picture prompt
        // and ask for the text to be typed or pasted instead.
        setPicture(scanImage);
        setScanNotice(false);
        setScanStatus(
          "Scanning did not work on this photo. The photo is pinned as a picture prompt above the camera — please type or paste the text in the Paste script tab instead.",
        );
      } finally {
        setScanBusy(false);
      }
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
    <section className="section" data-page="teleprompter">
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
                    disabled={pdfBusy}
                    onClick={() => void pickPdf(p)}
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
            <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>
              Saaf scan ke liye: roshni barabar ho, page par saya na ho,
              phone seedha page ke upar rakhein.
            </p>
            {scanImage && (
              <>
                <img
                  src={scanImage}
                  alt="Scanned page"
                  className="scan-preview"
                />
                <div className="rowbtns" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-gold"
                    disabled={scanBusy}
                    onClick={() => void handleAiScan()}
                  >
                    AI scan — best reading
                  </button>
                  <button
                    type="button"
                    className="btn btn-line"
                    disabled={scanBusy}
                    onClick={() => void handlePhoneScan()}
                  >
                    Scan on this phone (free)
                  </button>
                </div>
                <p
                  className="sub"
                  style={{ marginTop: 8, marginBottom: 0 }}
                >
                  AI scan sends this photo to Google Gemini to read it. The
                  photo is not saved anywhere else.
                </p>
              </>
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
        className={"record-btn" + (recording ? " recording" : "")}
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
              {saving ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Saving…
                </>
              ) : (
                "Save online"
              )}
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
