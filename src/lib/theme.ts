// ACTORVERSE — shared accent colours (UI polish)
// One tasteful accent per exercise department and per nav section.
// Gold stays the primary brand colour; accents are restrained and chosen
// to stay readable on the near-black background. Each entry has a solid
// colour plus a soft translucent version for chip / active backgrounds.

import type { Department } from "@/data/exercises";

export interface Accent {
  color: string;
  soft: string; // translucent background tint of the same hue
}

export const DEPT_ACCENTS: Record<Department, Accent> = {
  Voice: { color: "#6ec1ff", soft: "rgba(110, 193, 255, 0.16)" },
  Body: { color: "#5fd68a", soft: "rgba(95, 214, 138, 0.16)" },
  Emotion: { color: "#ff7a9e", soft: "rgba(255, 122, 158, 0.16)" },
  Imagination: { color: "#b48cff", soft: "rgba(180, 140, 255, 0.16)" },
  Camera: { color: "#ffb454", soft: "rgba(255, 180, 84, 0.16)" },
  Audition: { color: "#4dd8c4", soft: "rgba(77, 216, 196, 0.16)" },
  Dialect: { color: "#ff9a5c", soft: "rgba(255, 154, 92, 0.16)" },
  Movement: { color: "#b8e05c", soft: "rgba(184, 224, 92, 0.16)" },
  Mind: { color: "#8fa8ff", soft: "rgba(143, 168, 255, 0.16)" },
  Career: { color: "#ff8fd1", soft: "rgba(255, 143, 209, 0.16)" },
};

/** Accent for a department name that may be "All departments" or "General". */
export function deptAccent(department: string): Accent {
  return (
    (DEPT_ACCENTS as Record<string, Accent>)[department] ?? {
      color: "#f2c94c",
      soft: "rgba(242, 201, 76, 0.16)",
    }
  );
}

/** One accent per nav section / app area, used for sidebar icons and
 *  page-header accent bars. Gold leads for Dashboard and Admin. */
export const NAV_ACCENTS: Record<string, Accent> = {
  dashboard: { color: "#f2c94c", soft: "rgba(242, 201, 76, 0.18)" },
  exercises: { color: "#6ec1ff", soft: "rgba(110, 193, 255, 0.18)" },
  timer: { color: "#5fd68a", soft: "rgba(95, 214, 138, 0.18)" },
  teleprompter: { color: "#ffb454", soft: "rgba(255, 180, 84, 0.18)" },
  studio: { color: "#ff7a9e", soft: "rgba(255, 122, 158, 0.18)" },
  scripts: { color: "#b48cff", soft: "rgba(180, 140, 255, 0.18)" },
  monologues: { color: "#4dd8c4", soft: "rgba(77, 216, 196, 0.18)" },
  plans: { color: "#b8e05c", soft: "rgba(184, 224, 92, 0.18)" },
  coach: { color: "#ff9a5c", soft: "rgba(255, 154, 92, 0.18)" },
  analytics: { color: "#8fa8ff", soft: "rgba(143, 168, 255, 0.18)" },
  achievements: { color: "#ff8fd1", soft: "rgba(255, 143, 209, 0.18)" },
  community: { color: "#7ee0d2", soft: "rgba(126, 224, 210, 0.18)" },
  auditions: { color: "#ff8f6b", soft: "rgba(255, 143, 107, 0.18)" },
  admin: { color: "#f2c94c", soft: "rgba(242, 201, 76, 0.18)" },
};

/* ============================================================
   DS — the unified ACTORVERSE design-system tokens.
   Same values as the CSS custom properties in globals.css :root,
   so pages can use them in inline styles. Single source of truth
   for the premium cinematic system: deep black/charcoal surfaces,
   gold/champagne accents, white/soft-grey type.
   ============================================================ */

export const DS = {
  color: {
    bg: "#0a0805",
    bgSoft: "#12100a",
    surface: "#1b1610",
    surfaceRaised: "#2a2214",
    overlay: "rgba(6, 4, 2, 0.72)",
    ink: "#f8f0da",
    inkSecondary: "#d6c69c",
    inkMuted: "#a89878",
    line: "#43351f",
    lineSoft: "#33291a",
    gold: "#f2c94c",
    goldLight: "#f8d97a",
    goldDeep: "#b07d10",
    goldGradient:
      "linear-gradient(135deg, #f8d97a 0%, #f2c94c 45%, #dfa52a 100%)",
    goldText:
      "linear-gradient(120deg, #fbe28a 0%, #f2c94c 50%, #e8b23a 100%)",
    red: "#c1272d",
    green: "#4cc983",
    onGold: "#241a02",
  },
  font: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    display: {
      size: "clamp(2.2rem, 7vw, 3.6rem)",
      weight: 800,
      lineHeight: 1.1,
      letterSpacing: "-0.01em",
    },
    h1: { size: "clamp(1.9rem, 5vw, 2.6rem)", weight: 800, lineHeight: 1.15, letterSpacing: "-0.01em" },
    h2: { size: "clamp(1.5rem, 4vw, 2rem)", weight: 800, lineHeight: 1.2, letterSpacing: "-0.005em" },
    h3: { size: "1.05rem", weight: 700, lineHeight: 1.35, letterSpacing: "0" },
    body: { size: "1rem", weight: 400, lineHeight: 1.55, letterSpacing: "0" },
    small: { size: "0.85rem", weight: 400, lineHeight: 1.5, letterSpacing: "0" },
    eyebrow: { size: "0.72rem", weight: 800, lineHeight: 1.4, letterSpacing: "0.14em" },
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
    section: "28px",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "14px",
    xl: "20px",
    pill: "999px",
  },
  shadow: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.35)",
    md: "0 8px 22px rgba(0, 0, 0, 0.3)",
    lg: "0 12px 32px rgba(0, 0, 0, 0.55)",
    goldGlow: "0 6px 18px rgba(242, 201, 76, 0.25)",
    goldGlowStrong: "0 6px 30px rgba(242, 201, 76, 0.45)",
  },
  border: { line: "#43351f", lineSoft: "#33291a", gold: "rgba(242, 201, 76, 0.45)" },
  focusRing: "0 0 0 3px rgba(242, 201, 76, 0.22)",
  motion: {
    fast: "0.12s ease",
    base: "0.2s ease",
    slow: "0.35s cubic-bezier(0.22, 0.8, 0.32, 1)",
    pageIn: "pageIn 0.25s cubic-bezier(0.22, 0.8, 0.32, 1) both",
    cardIn: "cardIn 0.3s cubic-bezier(0.22, 0.8, 0.32, 1) both",
  },
  tapTargetMin: 44,
  sidebarWidth: 264,
  containerMax: 1080,
} as const;

export type DesignTokens = typeof DS;
