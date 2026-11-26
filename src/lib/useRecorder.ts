// ACTORVERSE — shared camera + recording state (Phase 2)
// One hook drives both the Teleprompter and the Studio, so recording
// behaves the same everywhere: one tap records, a second tap stops and
// saves the take. The take is kept on the page (downloadable) even when
// the online save fails — a failed upload never loses a performance.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_TAKE_BYTES,
  MAX_TAKE_SECONDS,
  SHOT_ZOOM,
  applyShotZoom,
  createFramedStream,
  formatBytes,
  pickMimeType,
  startCamera,
  stopStream,
} from "./recorder";
import type { Facing, FramedStream, ShotSize, Take } from "./recorder";

export { formatClock } from "./recorder";

export function useRecorder() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shot, setShotState] = useState<ShotSize>("wide");
  const [facing, setFacingState] = useState<Facing>("user");
  const [hardwareZoom, setHardwareZoom] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [lastTake, setLastTake] = useState<Take | null>(null);
  const [takeError, setTakeError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const shotRef = useRef<ShotSize>("wide");
  const facingRef = useRef<Facing>("user");
  const hardwareZoomRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const framedRef = useRef<FramedStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const startTimeRef = useRef(0);
  const stopResolverRef = useRef<((take: Take | null) => void) | null>(null);
  const mimeRef = useRef({ mimeType: "", extension: "webm" });

  // Attach the live stream to the preview video whenever it changes.
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {
        // Autoplay is blocked until the user taps; the tap already happened.
      });
    }
  }, [stream]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const openCamera = useCallback(
    async (nextFacing: Facing, nextShot: ShotSize): Promise<boolean> => {
      setCameraBusy(true);
      setCameraError(null);
      try {
        if (streamRef.current) stopStream(streamRef.current);
        if (framedRef.current) {
          framedRef.current.stop();
          framedRef.current = null;
        }
        const next = await startCamera(nextFacing);
        streamRef.current = next;
        setStream(next);
        setFacingState(nextFacing);
        facingRef.current = nextFacing;
        setShotState(nextShot);
        shotRef.current = nextShot;
        const zoomed = await applyShotZoom(next, nextShot);
        hardwareZoomRef.current = zoomed;
        setHardwareZoom(zoomed);
        setCameraOn(true);
        return true;
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : "The camera could not open.",
        );
        setCameraOn(false);
        return false;
      } finally {
        setCameraBusy(false);
      }
    },
    [],
  );

  const changeShot = useCallback(
    async (nextShot: ShotSize) => {
      setShotState(nextShot);
      shotRef.current = nextShot;
      if (!streamRef.current) return;
      const zoomed = await applyShotZoom(streamRef.current, nextShot);
      hardwareZoomRef.current = zoomed;
      setHardwareZoom(zoomed);
    },
    [],
  );

  const toggleFacing = useCallback(async () => {
    if (recording) return;
    const next: Facing = facingRef.current === "user" ? "environment" : "user";
    await openCamera(next, shotRef.current);
  }, [recording, openCamera]);

  const stopRecording = useCallback(async (): Promise<Take | null> => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return null;
    clearTimer();
    return new Promise<Take | null>((resolve) => {
      stopResolverRef.current = resolve;
      try {
        mr.stop();
      } catch {
        stopResolverRef.current = null;
        resolve(null);
      }
    });
  }, [clearTimer]);

  /** Clear the finished take from the page (e.g. after deleting it). */
  const clearTake = useCallback(() => {
    setLastTake(null);
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (recording) return false;
    const current = streamRef.current;
    const video = videoRef.current;
    if (!current || !video) {
      setTakeError("Open the camera first, then press RECORD.");
      return false;
    }
    setTakeError(null);
    setLastTake(null);
    const picked = pickMimeType();
    mimeRef.current = picked;

    // Decide what to record: the raw stream when the hardware zoom did
    // the framing, otherwise a canvas stream cropped to the same shot.
    let recordStream: MediaStream = current;
    let framed: FramedStream | null = null;
    if (!hardwareZoomRef.current && shotRef.current !== "wide") {
      framed = createFramedStream(current, video, shotRef.current);
      if (framed) {
        framedRef.current = framed;
        recordStream = framed.stream;
      }
    }

    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(recordStream, {
        mimeType: picked.mimeType || undefined,
        videoBitsPerSecond: 2_500_000,
      });
    } catch {
      try {
        mr = new MediaRecorder(recordStream);
      } catch {
        setTakeError(
          "Recording is not supported in this browser. Try Chrome on your phone.",
        );
        if (framed) {
          framed.stop();
          framedRef.current = null;
        }
        return false;
      }
    }
    chunksRef.current = [];
    mr.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onerror = () => {
      setTakeError(
        "Recording stopped unexpectedly. Your take was not saved — try again.",
      );
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: picked.mimeType || "video/webm",
      });
      const duration = Math.max(
        1,
        Math.round((Date.now() - startTimeRef.current) / 1000),
      );
      const take: Take = {
        blob,
        extension: picked.extension,
        mimeType: picked.mimeType || blob.type || "video/webm",
        durationSeconds: duration,
        sizeBytes: blob.size,
        tooLarge: blob.size > MAX_TAKE_BYTES,
      };
      setLastTake(take);
      if (take.tooLarge) {
        setTakeError(
          `This take is ${formatBytes(blob.size)} — too large to save online. It is still here: tap Save to phone to keep it.`,
        );
      }
      if (framedRef.current) {
        framedRef.current.stop();
        framedRef.current = null;
      }
      mediaRecorderRef.current = null;
      setRecording(false);
      const resolve = stopResolverRef.current;
      stopResolverRef.current = null;
      if (resolve) resolve(take);
    };

    try {
      mr.start(250);
    } catch {
      setTakeError("Recording could not start. Try opening the camera again.");
      return false;
    }
    mediaRecorderRef.current = mr;
    startTimeRef.current = Date.now();
    secondsRef.current = 0;
    setSeconds(0);
    setRecording(true);
    clearTimer();
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_TAKE_SECONDS) {
        void stopRecording().then(() => {
          setTakeError(
            "Take stopped at 10 minutes — that is the longest single take.",
          );
        });
      }
    }, 1000);
    return true;
  }, [recording, clearTimer, stopRecording]);

  const closeCamera = useCallback(async () => {
    if (mediaRecorderRef.current) {
      try {
        await stopRecording();
      } catch {
        // Ignore: we are closing anyway.
      }
    }
    clearTimer();
    if (framedRef.current) {
      framedRef.current.stop();
      framedRef.current = null;
    }
    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    setStream(null);
    setCameraOn(false);
    setRecording(false);
  }, [clearTimer, stopRecording]);

  // Stop everything when the page is left.
  useEffect(() => {
    return () => {
      clearTimer();
      if (framedRef.current) framedRef.current.stop();
      if (streamRef.current) stopStream(streamRef.current);
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stop();
        } catch {
          // Already stopped.
        }
      }
    };
  }, [clearTimer]);

  /** CSS zoom for the preview when the phone has no hardware zoom. */
  const previewScale = hardwareZoom ? 1 : SHOT_ZOOM[shot];

  return {
    videoRef,
    stream,
    cameraOn,
    cameraBusy,
    cameraError,
    shot,
    facing,
    hardwareZoom,
    previewScale,
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
    closeCamera,
  };
}
