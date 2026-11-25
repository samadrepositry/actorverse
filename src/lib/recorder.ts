// ACTORVERSE — camera + recording helpers (Phase 2)
// Shared by the Teleprompter and the Studio. Everything runs in the
// browser; nothing here touches the server.
//
// Rules baked in from the original app's fixes:
// - Prefer MP4 where the browser supports it (WebM often never shows up in
//   phone gallery apps). Fall back to WebM.
// - Cap the picture at 720p and cap the bitrate so normal takes stay small.
// - Never show a cryptic error: callers get plain-language messages.

export type ShotSize = "wide" | "medium" | "closeup";
export type Facing = "user" | "environment";

/** How much the picture is zoomed for each shot size. */
export const SHOT_ZOOM: Record<ShotSize, number> = {
  wide: 1,
  medium: 2,
  closeup: 2.6,
};

/** Takes bigger than this are not uploaded (they can still be downloaded). */
export const MAX_TAKE_BYTES = 50 * 1024 * 1024; // 50 MB

/** Longest single take: 10 minutes, then recording stops by itself. */
export const MAX_TAKE_SECONDS = 600;

export interface Take {
  blob: Blob;
  extension: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
  tooLarge: boolean;
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pick the best recording format this browser supports. MP4 first. */
export function pickMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "", extension: "webm" };
  }
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
    } catch {
      // Ignore and try the next format.
    }
  }
  return { mimeType: "", extension: "webm" };
}

/** Open the camera (720p) + microphone. Throws a plain-language error. */
export async function startCamera(facing: Facing): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    throw new Error(
      "This browser cannot open the camera. Try Chrome on your phone.",
    );
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: facing,
      },
      audio: true,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new Error(
        "Camera is blocked. Allow camera and microphone for this site, then try again.",
      );
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      throw new Error(
        "No camera was found on this device. Try the other camera.",
      );
    }
    throw new Error(
      "The camera could not open. Close other apps using the camera and try again.",
    );
  }
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      // Already stopped.
    }
  });
}

/**
 * Try the phone's real camera zoom for the chosen shot. Returns true when
 * the hardware zoom actually applied, so the preview and the recording
 * match without any extra work.
 */
export async function applyShotZoom(
  stream: MediaStream,
  shot: ShotSize,
): Promise<boolean> {
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== "function") return false;
  try {
    const caps = track.getCapabilities() as unknown as {
      zoom?: { min: number; max: number };
    };
    if (!caps.zoom) return false;
    const wanted = Math.min(SHOT_ZOOM[shot], caps.zoom.max);
    const wantedClamped = Math.max(caps.zoom.min, wanted);
    await track.applyConstraints({
      advanced: [{ zoom: wantedClamped } as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

export interface FramedStream {
  stream: MediaStream;
  stop: () => void;
}

/**
 * Software fallback when the phone has no camera zoom: draw the camera
 * picture into a canvas, cropped to the chosen shot, and record that.
 * The microphone track is carried over, so the sound stays in sync.
 * Returns null when framing is not needed (Wide) or the canvas fails.
 */
export function createFramedStream(
  source: MediaStream,
  video: HTMLVideoElement,
  shot: ShotSize,
): FramedStream | null {
  const zoom = SHOT_ZOOM[shot];
  if (zoom <= 1) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (typeof canvas.captureStream !== "function") return null;
    let stopped = false;
    let raf = 0;
    const draw = () => {
      if (stopped) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0) {
        const sw = vw / zoom;
        const sh = vh / zoom;
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1280, 720);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const framed = canvas.captureStream(30);
    source.getAudioTracks().forEach((t) => framed.addTrack(t));
    return {
      stream: framed,
      stop: () => {
        stopped = true;
        cancelAnimationFrame(raf);
      },
    };
  } catch {
    return null;
  }
}

/** Download any blob to the phone (used by the "Save to phone" buttons). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Download a file from a URL (used for saved takes from Storage). */
export async function downloadFromUrl(
  url: string,
  filename: string,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed. Check your connection.");
  const blob = await res.blob();
  downloadBlob(blob, filename);
}
