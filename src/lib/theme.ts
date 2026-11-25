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
