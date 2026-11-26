"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { showToast } from "@/components/Toast";

const PRESETS = [1, 2, 5, 10, 15];

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimerContent() {
  const searchParams = useSearchParams();
  const exerciseTitle = searchParams.get("exercise") ?? "";
  const department = searchParams.get("department") ?? "";
  const initialMinutes = Number(searchParams.get("minutes") ?? 5) || 5;

  const [total, setTotal] = useState(initialMinutes * 60);
  const [left, setLeft] = useState(initialMinutes * 60);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState("Ready");
  const [saved, setSaved] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggedRef = useRef(false);

  // Check sign-in state once, so we can explain whether the session will save.
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

  function setTimer(minutes: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setTotal(minutes * 60);
    setLeft(minutes * 60);
    setState("Ready");
    setSaved(null);
    loggedRef.current = false;
  }

  async function logSession(minutes: number) {
    if (loggedRef.current) return;
    loggedRef.current = true;
    if (!isSupabaseConfigured()) {
      setSaved("Session finished — sign-in is not set up yet, so it was not saved.");
      return;
    }
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaved(
          "Session finished — sign in to save your sessions. This one was not saved.",
        );
        return;
      }
      const { error } = await supabase.from("sessions").insert({
        user_id: user.id,
        exercise_title: exerciseTitle || "Free practice",
        department: department || "General",
        kind: "timer",
        minutes,
      });
      if (error) throw error;
      setSaved("Done — session saved to your progress.");
      showToast("Session saved.");
    } catch (err) {
      setSaved(
        `Session finished, but it could not be saved: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      );
    }
  }

  function handleStartPause() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
      setState("Paused");
      return;
    }
    if (left <= 0) setLeft(total);
    setRunning(true);
    setState("Running…");
    intervalRef.current = setInterval(() => {
      setLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          setState("Done ✓");
          void logSession(Math.max(1, Math.round(total / 60)));
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const progress = total > 0 ? ((total - left) / total) * 100 : 0;
  // Progress ring: circumference for r=120 (2πr ≈ 753.98).
  const ringC = 2 * Math.PI * 120;
  const ringOffset = ringC * (1 - progress / 100);

  return (
    <section className="section" data-page="timer">
      <div className="page-head">
        <span className="eyebrow">Practice</span>
        <h1>My Timer</h1>
        <span className="accent-bar" aria-hidden="true" />
        <p>
          For any exercise or rehearsal. Pick a time, press Start — when it
          finishes, it saves by itself.
        </p>
      </div>
      <div
        className={"card card-gold" + (running ? " timer-running" : "")}
        style={{ maxWidth: 640, margin: "0 auto" }}
      >
        {exerciseTitle && (
          <p style={{ textAlign: "center", margin: "0 0 4px" }}>
            <strong>{exerciseTitle}</strong>
            {department ? ` — ${department}` : ""}
          </p>
        )}
        <div className="timer-face">
          <div
            style={{
              position: "relative",
              width: "min(76vw, 300px)",
              height: "min(76vw, 300px)",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 260 260"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                transform: "rotate(-90deg)",
              }}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="timer-ring-gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f8d97a" />
                  <stop offset="45%" stopColor="#f2c94c" />
                  <stop offset="100%" stopColor="#dfa52a" />
                </linearGradient>
              </defs>
              <circle
                cx="130"
                cy="130"
                r="120"
                fill="none"
                stroke="var(--gold)"
                strokeOpacity={0.25}
                strokeWidth="10"
              />
              <circle
                cx="130"
                cy="130"
                r="120"
                fill="none"
                stroke="url(#timer-ring-gold)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringC}
                strokeDashoffset={ringOffset}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="big" aria-live="off">
              {format(left)}
            </div>
          </div>
          <div className="prog">
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="sub" style={{ margin: "8px 0 0" }}>
            {state}
          </div>
        </div>
        <div className="presets" role="group" aria-label="Timer presets">
          {PRESETS.map((min) => (
            <button
              key={min}
              type="button"
              className="preset"
              style={{ minHeight: 44 }}
              aria-pressed={total / 60 === min}
              onClick={() => setTimer(min)}
            >
              {min} min
            </button>
          ))}
        </div>
        <div className="rowbtns" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStartPause}
          >
            {running ? "Pause" : left < total && left > 0 ? "Resume" : "Start"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setTimer(total / 60)}
          >
            Reset
          </button>
        </div>
        {saved && (
          <p
            className={saved.startsWith("Done") ? "success" : "note"}
            style={{ textAlign: "center", marginTop: 16 }}
            role="status"
          >
            {saved}
          </p>
        )}
        {signedIn === false && !saved && (
          <p className="note" style={{ textAlign: "center" }}>
            You are not signed in — the timer still works, but signing in
            saves your sessions.
          </p>
        )}
      </div>
    </section>
  );
}

export default function TimerPage() {
  return (
    <Suspense fallback={<p>Loading timer…</p>}>
      <TimerContent />
    </Suspense>
  );
}
