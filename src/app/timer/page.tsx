"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

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

  return (
    <section className="section">
      <h2>My Timer</h2>
      <p className="sub">
        For any exercise or rehearsal. Pick a time, press Start — when it
        finishes, it saves by itself.
      </p>
      <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
        {exerciseTitle && (
          <p style={{ textAlign: "center", margin: "0 0 4px" }}>
            <strong>{exerciseTitle}</strong>
            {department ? ` — ${department}` : ""}
          </p>
        )}
        <div className="timer-face">
          <div className="big" aria-live="off">
            {format(left)}
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
            className="btn btn-red"
            onClick={handleStartPause}
          >
            {running ? "Pause" : left < total && left > 0 ? "Resume" : "Start"}
          </button>
          <button
            type="button"
            className="btn btn-line"
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
