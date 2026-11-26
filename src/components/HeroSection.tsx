"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type HeroBand = "morning" | "day" | "evening" | "night";

const GREETINGS: Record<HeroBand, string> = {
  morning: "Good morning, actor.",
  day: "Good afternoon, actor.",
  evening: "Good evening, actor.",
  night: "Good night, actor.",
};

/**
 * Time-of-day band from the USER'S device clock (client-side only — the
 * server renders in another timezone). Morning 5–11, day 11–17,
 * evening 17–20, night 20–5.
 */
export function heroBandForHour(hour: number): HeroBand {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

export default function HeroSection({
  exercisesCount,
  departmentsCount,
}: {
  exercisesCount: number;
  departmentsCount: number;
}) {
  // Default to evening (the warm rest-house look) before hydration, so
  // the server render and the first client render match exactly.
  const [band, setBand] = useState<HeroBand>("evening");

  useEffect(() => {
    const update = () =>
      setBand(heroBandForHour(new Date().getHours()));
    update();
    // Re-check every minute so the mood follows the clock if the app
    // stays open across a band boundary.
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero" data-time={band}>
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-grain" aria-hidden="true" />
      {band === "night" && (
        <>
          <div className="hero-stars" aria-hidden="true" />
          <div className="hero-moon" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <defs>
                <mask id="hero-moon-cut">
                  <rect width="64" height="64" fill="white" />
                  <circle cx="43" cy="23" r="20" fill="black" />
                </mask>
              </defs>
              <circle cx="30" cy="33" r="20" fill="#e9edf6" mask="url(#hero-moon-cut)" />
            </svg>
          </div>
        </>
      )}
      <div className="hero-inner">
        <p className="hero-welcome">{GREETINGS[band]}</p>
        <div className="brand" style={{ fontSize: "0.8rem" }}>
          A C T O R V E R S E
        </div>
        <span className="hero-rule" aria-hidden="true" />
        <h1>
          Train Like an Athlete.
          <br />
          <em>Perform Like a Legend.</em>
        </h1>
        <p className="tagline">
          A complete training ground for actors — voice, body, camera and
          auditions — in one app.
        </p>
        <div className="hero-stats">
          <div className="hstat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="1.5" y="9" width="3.5" height="6" rx="1" />
              <rect x="19" y="9" width="3.5" height="6" rx="1" />
              <rect x="5" y="11" width="14" height="2" rx="1" />
            </svg>
            <b>{exercisesCount}</b>
            <span>Exercises</span>
          </div>
          <div className="hstat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
            </svg>
            <b>{departmentsCount}</b>
            <span>Departments</span>
          </div>
          <div className="hstat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 2.5h9L19 6.5v15H6z" />
              <path d="M14.5 2.5v4.5H19" />
              <path d="M9 11h6M9 14.5h6M9 18h4" />
            </svg>
            <b>14</b>
            <span>Monologues</span>
          </div>
        </div>
        <div className="hero-cta">
          <Link href="/exercises" className="btn btn-gold">
            Browse Exercises
          </Link>
          <Link href="/timer" className="btn btn-ghost">
            Open the Timer
          </Link>
          <Link href="/teleprompter" className="btn btn-ghost">
            Open the Teleprompter
          </Link>
        </div>
        <p className="hero-free">
          <span className="hero-free-dot" aria-hidden="true" />
          Free · Rs 0 · No card
        </p>
        <div className="hero-features">
          <Link href="/teleprompter" className="hero-feature">
            <span
              className="hero-feature-icon"
              style={{ color: "#ffb454", background: "rgba(255, 180, 84, 0.14)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="6" width="13" height="12" rx="2" />
                <path d="M15 10.5l7-3.5v10l-7-3.5" />
              </svg>
            </span>
            <span>
              <b>Teleprompter</b>
              <i>Record while you read</i>
            </span>
          </Link>
          <Link href="/coach" className="hero-feature">
            <span
              className="hero-feature-icon"
              style={{ color: "#ff9a5c", background: "rgba(255, 154, 92, 0.14)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.35-4.1-1L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z" />
              </svg>
            </span>
            <span>
              <b>AI Coach</b>
              <i>Your coach in English or Urdu</i>
            </span>
          </Link>
          <Link href="/scripts" className="hero-feature">
            <span
              className="hero-feature-icon"
              style={{ color: "#b48cff", background: "rgba(180, 140, 255, 0.14)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2.5h9L19 6.5v15H6z" />
                <path d="M14.5 2.5v4.5H19" />
                <path d="M9 11h6M9 14.5h6M9 18h4" />
              </svg>
            </span>
            <span>
              <b>Script Vault</b>
              <i>Your private PDFs</i>
            </span>
          </Link>
          <Link href="/auditions" className="hero-feature">
            <span
              className="hero-feature-icon"
              style={{ color: "#ff8f6b", background: "rgba(255, 143, 107, 0.14)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 8.8l6.1-.7z" />
              </svg>
            </span>
            <span>
              <b>Auditions</b>
              <i>Find or post auditions</i>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
