// ACTORVERSE — Training plans (Phase 3)
// Seven ORIGINAL training plans written for this app. Every plan is free
// to enrol in: Free Mode is on, so enrolment costs Rs 0.

import type { Department, Level } from "./exercises";

export interface TrainingPlan {
  id: string;
  title: string;
  department: Department | "All departments";
  weeks: number;
  level: Level | "All levels";
  minutesPerDay: number;
  description: string;
  dailyFocus: string[];
}

export const PLANS: TrainingPlan[] = [
  {
    id: "voice-foundation",
    title: "Voice Foundation",
    department: "Voice",
    weeks: 4,
    level: "Beginner",
    minutesPerDay: 20,
    description:
      "Build a strong, clear voice from zero: breathing, warm-ups and simple speaking drills you can do every day.",
    dailyFocus: [
      "Deep breathing — 5 slow breaths, belly out",
      "Hum up and down the scale for 2 minutes",
      "Tongue twister, 5 times, slow then fast",
      "Read one page aloud, clear and slow",
      "Record yourself and listen back once",
    ],
  },
  {
    id: "body-movement",
    title: "Body & Movement",
    department: "Body",
    weeks: 4,
    level: "Beginner",
    minutesPerDay: 20,
    description:
      "Wake up your body for the stage: posture, balance and simple movement so every gesture looks natural.",
    dailyFocus: [
      "Stand tall — shoulders back, 2 minutes",
      "Slow walk across the room, every step counted",
      "Mirror drill: show happy, sad, angry with the body only",
      "Stretch arms, neck and back for 5 minutes",
      "Walk like a different person for 2 minutes",
    ],
  },
  {
    id: "camera-confidence",
    title: "Camera Confidence",
    department: "Camera",
    weeks: 3,
    level: "Beginner",
    minutesPerDay: 15,
    description:
      "Stop fearing the camera. Short daily takes until looking into the lens feels normal.",
    dailyFocus: [
      "One 1-minute take: introduce yourself to the camera",
      "Watch it back — note one thing to fix",
      "Close-up take: say one line with a smile",
      "Wide shot take: enter the frame and speak",
      "Re-record your best line of the day",
    ],
  },
  {
    id: "audition-ready",
    title: "Audition Ready",
    department: "Audition",
    weeks: 4,
    level: "Intermediate",
    minutesPerDay: 30,
    description:
      "Prepare like a working actor: pick a monologue, polish it, and practise the whole audition day from entry to exit.",
    dailyFocus: [
      "Read your audition monologue aloud twice",
      "Practise the first 30 seconds until it is smooth",
      "Record a full audition run and watch it back",
      "Practise answering one interview question",
      "Cold read: perform a new page on first sight",
    ],
  },
  {
    id: "emotion-imagination",
    title: "Emotion & Imagination",
    department: "Emotion",
    weeks: 4,
    level: "Intermediate",
    minutesPerDay: 25,
    description:
      "Feel it for real: memory, imagination and sense work that make emotions honest instead of acted.",
    dailyFocus: [
      "Remember one real moment of joy — live in it for 2 minutes",
      "Sense memory: hold an imaginary hot cup of tea",
      "Say one line happy, then sad, then angry",
      "Imagine the room where your scene happens",
      "Write two lines about what your character wants",
    ],
  },
  {
    id: "dialect-starter",
    title: "Dialect Starter",
    department: "Dialect",
    weeks: 3,
    level: "Beginner",
    minutesPerDay: 15,
    description:
      "Train your ear and mouth for new sounds: listen, copy and record until a new accent starts to feel natural.",
    dailyFocus: [
      "Listen to 2 minutes of the target accent",
      "Copy 5 short sentences, out loud",
      "Record yourself and compare with the original",
      "Say your own name and city in the accent",
      "Read one paragraph in the accent, slowly",
    ],
  },
  {
    id: "30-day-challenge",
    title: "30-Day Actor Challenge",
    department: "All departments",
    weeks: 4,
    level: "All levels",
    minutesPerDay: 30,
    description:
      "One month, every department. A new focus each day — voice, body, emotion, camera and more — until training is a habit.",
    dailyFocus: [
      "Day 1–5: voice and breathing",
      "Day 6–10: body and movement",
      "Day 11–15: emotion and imagination",
      "Day 16–20: camera and monologues",
      "Day 21–25: audition practice",
      "Day 26–30: your best takes, recorded and reviewed",
    ],
  },
];
