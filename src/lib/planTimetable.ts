// ACTORVERSE — Plan timetables (My Enrolled Courses)
// Week-by-week training plans, built to a real acting-school standard:
// foundations first, then technique, then application, then performance.
// Each day names the skill it builds ("Builds: ...") and picks specific
// exercises from the 170-exercise library — the right exercise for the
// right week, never a mechanical rotation. Every exercise links to the
// existing "Start with timer" flow (/timer?exercise=...), which
// auto-starts on arrival. Nothing here is faked: the current week comes
// from the real enrolment date, and a day is marked done only when a
// real practice session was saved for that day (sessions table).
//
// Plans have no days-per-week field, so timetables run 5 days a week
// (Monday–Friday). Free Mode is on — everything is Rs 0, no paywall.

import { EXERCISES } from "@/data/exercises";
import type { Department, Exercise, Level } from "@/data/exercises";
import { PLANS } from "@/data/plans";
import type { TrainingPlan } from "@/data/plans";
import type { EnrollmentRow } from "@/lib/plans";

export interface PlanInput {
  id: string;
  title: string;
  department: Department | "All departments";
  weeks: number;
  level: Level | "All levels";
  minutesPerDay: number;
  description: string;
}

export interface TimetableDay {
  /** 0 = Monday … 4 = Friday */
  dayIndex: number;
  label: string;
  /** Calendar date of this day (Monday–Friday of its week). */
  date: Date;
  /** What skill this day builds, in plain words. */
  purpose: string;
  exercises: Exercise[];
  totalMinutes: number;
}

export interface TimetableWeek {
  week: number;
  theme: string;
  /** "By the end of this week you will be able to…" */
  outcome: string;
  days: TimetableDay[];
}

export interface BuiltTimetable {
  weeks: TimetableWeek[];
  /** "By the end of this plan you will be able to…" */
  planOutcome: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/* ------------------------------------------------------------------ */
/* Curricula — one deliberate progression per department. Each stage   */
/* is one week: a theme, an outcome, and five days. Each day names     */
/* its purpose and the keywords used to pick its exercises. A plan     */
/* with 3 weeks uses stages 0, 1 and 3 (foundations, technique,       */
/* performance); a 4-week plan uses all four; longer custom plans     */
/* repeat the middle stages.                                           */
/* ------------------------------------------------------------------ */

interface DaySpec {
  purpose: string;
  keywords: string[];
  department?: Department;
}

interface WeekStage {
  theme: string;
  outcome: string;
  days: DaySpec[];
}

interface Curriculum {
  outcome: string;
  stages: WeekStage[];
}

const VOICE: Curriculum = {
  outcome:
    "speak clearly and confidently for a full scene — steady breath, clear words, and a voice that reaches the back of the room without strain.",
  stages: [
    {
      theme: "Breath & Warm-Up",
      outcome:
        "breathe from the belly and warm your voice up safely in 5 minutes.",
      days: [
        { purpose: "Learn belly breathing — the base of all voice work.", keywords: ["breath", "support"] },
        { purpose: "Loosen the lips and voice with gentle warm-ups.", keywords: ["trill", "siren", "hum"] },
        { purpose: "Wake up the articulators — lips, jaw, tongue.", keywords: ["articulation", "tongue"] },
        { purpose: "Speak clearly on one steady breath.", keywords: ["breath", "read", "diction"] },
        { purpose: "Put it together: breathe, warm up, read aloud.", keywords: ["breath", "read", "warm"] },
      ],
    },
    {
      theme: "Clarity & Diction",
      outcome:
        "speak every word clearly, even at speed, with crisp consonants.",
      days: [
        { purpose: "Crisp consonants — every ending heard.", keywords: ["diction", "consonant"] },
        { purpose: "Tongue twisters, slow then fast.", keywords: ["tongue", "twister"] },
        { purpose: "Control your pace — slow, normal, fast.", keywords: ["pace"] },
        { purpose: "Use pauses to give your lines weight.", keywords: ["pause"] },
        { purpose: "Read a full page aloud, clear and steady.", keywords: ["read", "aloud"] },
      ],
    },
    {
      theme: "Power & Projection",
      outcome:
        "fill a room with your voice without shouting or strain.",
      days: [
        { purpose: "Find your resonance — let the voice ring.", keywords: ["resonance", "hum"] },
        { purpose: "Climb the volume ladder, whisper to full.", keywords: ["volume"] },
        { purpose: "Project without strain.", keywords: ["projection"] },
        { purpose: "Hold a note steady — breath control under pressure.", keywords: ["sustained", "note"] },
        { purpose: "Whisper to full voice in one line.", keywords: ["whisper", "voice"] },
      ],
    },
    {
      theme: "Performance: Read & Record",
      outcome:
        "perform a full page with colour and confidence — and hear it back and fix one thing.",
      days: [
        { purpose: "Add emotional colour to a line.", keywords: ["emotional", "colour"] },
        { purpose: "Read the news aloud like a real speaker.", keywords: ["read", "news"] },
        { purpose: "Keep a voice diary — track your own sound.", keywords: ["diary"] },
        { purpose: "Clarity check — no accent, every word clean.", keywords: ["clarity", "accent"] },
        { purpose: "Your best take: record, listen, fix one thing.", keywords: ["read", "record", "diary"] },
      ],
    },
  ],
};

const BODY: Curriculum = {
  outcome:
    "have a body that is awake on stage — straight posture, easy balance, and gestures that look natural, not acted.",
  stages: [
    {
      theme: "Posture & Balance",
      outcome: "stand tall without effort and balance on one leg, calm and steady.",
      days: [
        { purpose: "Find your neutral stance.", keywords: ["stance", "neutral"] },
        { purpose: "Reset your posture — shoulders back, chin level.", keywords: ["posture"] },
        { purpose: "Release neck and shoulder tension.", keywords: ["neck", "shoulder"] },
        { purpose: "Balance on one leg, steady and calm.", keywords: ["balance"] },
        { purpose: "Roll the spine down and come back up tall.", keywords: ["spine", "roll"] },
      ],
    },
    {
      theme: "Gesture & Expression",
      outcome: "use your hands and body to say what words cannot.",
      days: [
        { purpose: "Fewer gestures, more meaning.", keywords: ["gesture"] },
        { purpose: "Walk the room — every step counted.", keywords: ["walk"] },
        { purpose: "Mirror drill: show feelings with the body only.", keywords: ["mirror"] },
        { purpose: "Slow motion walk — control every muscle.", keywords: ["slow", "walk"] },
        { purpose: "Physical opposites — big and small in one body.", keywords: ["opposite"] },
      ],
    },
    {
      theme: "Moving With Purpose",
      outcome: "walk, sit and move like a different person.",
      days: [
        { purpose: "Centre yourself before a scene.", keywords: ["centre", "grounding"] },
        { purpose: "Walk like a different person.", keywords: ["character", "walk"] },
        { purpose: "Chair work — sit with intention.", keywords: ["chair"] },
        { purpose: "Warm-up stretch flow for the whole body.", keywords: ["stretch", "warm"] },
        { purpose: "Tension and release — let the body go.", keywords: ["tension", "release"] },
      ],
    },
    {
      theme: "Performance: Full-Body Scenes",
      outcome: "perform a short scene where your body tells the story.",
      days: [
        { purpose: "Grounding before the scene.", keywords: ["grounding"] },
        { purpose: "Character walk — become someone else.", keywords: ["character", "walk"] },
        { purpose: "Mirror movement with a partner in mind.", keywords: ["mirror"] },
        { purpose: "Puppet string — move from one centre.", keywords: ["puppet"] },
        { purpose: "Your best take: a full-body moment, recorded.", keywords: ["character", "walk", "mirror"] },
      ],
    },
  ],
};

const CAMERA: Curriculum = {
  outcome:
    "look into the lens like it is a friend — you will know your frame, hold stillness, and give a clean take every time.",
  stages: [
    {
      theme: "Facing the Lens",
      outcome: "look into the lens without fear and speak one full minute to camera.",
      days: [
        { purpose: "Make the lens your friend.", keywords: ["lens", "friend"] },
        { purpose: "Camera-ready voice — natural at close range.", keywords: ["camera-ready", "voice"] },
        { purpose: "The audition room frame — chest up, eyes level.", keywords: ["audition", "frame"] },
        { purpose: "Self-tape lighting — look your best on camera.", keywords: ["lighting"] },
        { purpose: "One full minute to camera: introduce yourself.", keywords: ["lens", "camera-ready"] },
      ],
    },
    {
      theme: "Framing & Stillness",
      outcome: "hit your mark and hold a still, honest frame.",
      days: [
        { purpose: "Check your framing — head, shoulders, space.", keywords: ["framing"] },
        { purpose: "Hit your mark every time.", keywords: ["mark"] },
        { purpose: "Stillness on camera — do less, mean more.", keywords: ["stillness"] },
        { purpose: "Control your eyeline.", keywords: ["eyeline"] },
        { purpose: "Background awareness — what is behind you.", keywords: ["background"] },
      ],
    },
    {
      theme: "Takes & Review",
      outcome: "record a take, watch it back, and fix one thing.",
      days: [
        { purpose: "The close-up whisper — small is big.", keywords: ["close-up", "whisper", "small"] },
        { purpose: "React to a voice off-camera.", keywords: ["reacting", "off-camera"] },
        { purpose: "Turn to camera on the line.", keywords: ["turn", "camera"] },
        { purpose: "Two-person frame — share the screen.", keywords: ["two-person", "frame"] },
        { purpose: "Eye contact with the reader.", keywords: ["eye", "reader"] },
      ],
    },
    {
      theme: "Performance: Your Best Takes",
      outcome: "deliver a clean 1-minute take you would be proud to send.",
      days: [
        { purpose: "The long take — stay in it for the full minute.", keywords: ["long", "take"] },
        { purpose: "Over-the-shoulder line — act past the camera.", keywords: ["over-the-shoulder"] },
        { purpose: "Continuity check — same take, same energy.", keywords: ["continuity"] },
        { purpose: "Your best line, close-up.", keywords: ["close-up"] },
        { purpose: "Final take: record, review, keep your best.", keywords: ["long", "take", "close-up"] },
      ],
    },
  ],
};

const AUDITION: Curriculum = {
  outcome:
    "walk into an audition calm and ready — slate, first lines, cold read and a full mock audition, all done.",
  stages: [
    {
      theme: "Choosing the Piece",
      outcome: "pick a monologue that fits you and read it clean.",
      days: [
        { purpose: "Choose your monologue.", keywords: ["monologue", "choice"] },
        { purpose: "Warm up like a pro before you start.", keywords: ["warm-up"] },
        { purpose: "The first ten seconds — win the room fast.", keywords: ["first", "ten"] },
        { purpose: "Slate like a pro — name, piece, smile.", keywords: ["slate"] },
        { purpose: "The confident slate, three times.", keywords: ["slate", "confident"] },
      ],
    },
    {
      theme: "Polishing the Opening",
      outcome: "open any audition smoothly and recover if you forget a line.",
      days: [
        { purpose: "Sides in five minutes — fast, smart prep.", keywords: ["sides"] },
        { purpose: "When you forget a line — recover with grace.", keywords: ["forget", "line"] },
        { purpose: "Dressing the part — look the role.", keywords: ["dressing"] },
        { purpose: "Waiting room calm — breathe before you enter.", keywords: ["waiting", "calm"] },
        { purpose: "The thank-you exit — leave well.", keywords: ["thank-you", "exit"] },
      ],
    },
    {
      theme: "The Full Run",
      outcome: "do a complete audition from entry to exit.",
      days: [
        { purpose: "Cold read sprint — new page, first sight.", keywords: ["cold", "read"] },
        { purpose: "The callback mindset — they already like you.", keywords: ["callback"] },
        { purpose: "Reading the room — adjust to the panel.", keywords: ["reading", "room"] },
        { purpose: "Self-tape audition — frame, light, send.", keywords: ["self-tape"] },
        { purpose: "The second take — better than the first.", keywords: ["second", "take"] },
      ],
    },
    {
      theme: "Audition Day Rehearsal",
      outcome: "walk in, perform a full mock audition, and handle the no like a pro.",
      days: [
        { purpose: "Mock audition — the whole thing, timed.", keywords: ["mock"] },
        { purpose: "Audition journal — what worked, what to fix.", keywords: ["journal"] },
        { purpose: "Handling the no — it is not about you.", keywords: ["handling", "no"] },
        { purpose: "Your best slate and first lines, recorded.", keywords: ["slate", "first"] },
        { purpose: "Final mock audition — entry to exit.", keywords: ["mock"] },
      ],
    },
  ],
};

const EMOTION: Curriculum = {
  outcome:
    "feel it for real instead of acting it — your emotions will be honest, and the audience will feel them too.",
  stages: [
    {
      theme: "Sense Memory Basics",
      outcome: "use a real sense memory to bring a feeling alive.",
      days: [
        { purpose: "Sense memory — a cup of tea.", keywords: ["sense", "tea"] },
        { purpose: "Breathing the emotion — let breath lead.", keywords: ["breathing", "emotion"] },
        { purpose: "Joy in the body — where does it live?", keywords: ["joy"] },
        { purpose: "Listening with feeling.", keywords: ["listening", "feeling"] },
        { purpose: "Personal object — one thing, one memory.", keywords: ["personal", "object"] },
      ],
    },
    {
      theme: "Feeling It Honestly",
      outcome: "play fear, anger and grief without pushing.",
      days: [
        { purpose: "Fear, honestly.", keywords: ["fear"] },
        { purpose: "Anger without shouting.", keywords: ["anger"] },
        { purpose: "Grief in small moments.", keywords: ["grief"] },
        { purpose: "Emotional memory — rain.", keywords: ["memory", "rain"] },
        { purpose: "The before moment — what happened just before.", keywords: ["before"] },
      ],
    },
    {
      theme: "Switching Emotions",
      outcome: "switch feelings in a breath and keep them true.",
      days: [
        { purpose: "The switch — happy to sad in one line.", keywords: ["switch"] },
        { purpose: "Laugh to cry shift.", keywords: ["laugh", "cry"] },
        { purpose: "Opposite day — play against the line.", keywords: ["opposite"] },
        { purpose: "Emotion on a scale of ten.", keywords: ["scale", "ten"] },
        { purpose: "Substitution practice — borrow a real feeling.", keywords: ["substitution"] },
      ],
    },
    {
      theme: "Performance: Living the Scene",
      outcome: "perform a silent scene where the feeling is the whole story.",
      days: [
        { purpose: "The silent scene — no words, all feeling.", keywords: ["silent", "scene"] },
        { purpose: "The quiet apology.", keywords: ["quiet", "apology"] },
        { purpose: "Emotional recall journal.", keywords: ["journal", "recall"] },
        { purpose: "Your best take: one honest moment.", keywords: ["silent", "scene", "quiet"] },
        { purpose: "Final performance — live the scene.", keywords: ["silent", "scene"] },
      ],
    },
  ],
};

const DIALECT: Curriculum = {
  outcome:
    "hear new sounds with your ear and make them with your mouth — a new accent you can hold through a whole scene.",
  stages: [
    {
      theme: "Listening & Ear Training",
      outcome: "hear the sounds of the target accent clearly.",
      days: [
        { purpose: "Listening ear — just listen first.", keywords: ["listening", "ear"] },
        { purpose: "Ear training pairs — same or different?", keywords: ["ear", "training"] },
        { purpose: "Vowel mapping — Urdu to English.", keywords: ["vowel", "mapping"] },
        { purpose: "Word lists by sound.", keywords: ["word", "lists"] },
        { purpose: "The accent journal — what you heard today.", keywords: ["journal", "accent"] },
      ],
    },
    {
      theme: "Copying Sounds",
      outcome: "copy the accent's sounds with your own mouth.",
      days: [
        { purpose: "Consonant shifts.", keywords: ["consonant", "shifts"] },
        { purpose: "Tongue placement.", keywords: ["tongue"] },
        { purpose: "Mimic the newsreader.", keywords: ["mimic", "newsreader"] },
        { purpose: "Singing in accent — melody helps memory.", keywords: ["singing"] },
        { purpose: "Rhythm and stress — the music of the accent.", keywords: ["rhythm", "stress"] },
      ],
    },
    {
      theme: "Speaking in Accent",
      outcome: "hold the accent through a full scene.",
      days: [
        { purpose: "From your accent out — keep your own voice.", keywords: ["from", "accent"] },
        { purpose: "Accent in conversation.", keywords: ["conversation"] },
        { purpose: "The interview test.", keywords: ["interview", "test"] },
        { purpose: "Accent cool-down — return to your own voice.", keywords: ["cool-down"] },
        { purpose: "Your best take: one scene, full accent.", keywords: ["conversation", "interview"] },
      ],
    },
    {
      theme: "Performance: Accent in a Scene",
      outcome: "perform a full scene in the accent and pass an interview test.",
      days: [
        { purpose: "Accent in conversation — keep it alive.", keywords: ["conversation"] },
        { purpose: "The interview test, full run.", keywords: ["interview", "test"] },
        { purpose: "Mimic the newsreader, full paragraph.", keywords: ["mimic", "newsreader"] },
        { purpose: "Rhythm and stress in a real scene.", keywords: ["rhythm", "stress"] },
        { purpose: "Final performance — one scene, full accent.", keywords: ["conversation", "interview"] },
      ],
    },
  ],
};

const ALL_DEPARTMENTS: Curriculum = {
  outcome:
    "have training as a habit — voice, body, emotion, camera and auditions, all practised, all in one month.",
  stages: [
    {
      theme: "Voice & Breath",
      outcome: "breathe deep and speak clearly for a full minute.",
      days: [
        { purpose: "Belly breathing — the base of all voice work.", keywords: ["breath", "support"], department: "Voice" },
        { purpose: "Loosen the voice with gentle warm-ups.", keywords: ["trill", "siren", "hum"], department: "Voice" },
        { purpose: "Crisp consonants — every ending heard.", keywords: ["diction", "consonant"], department: "Voice" },
        { purpose: "Control your pace — slow, normal, fast.", keywords: ["pace"], department: "Voice" },
        { purpose: "Read a full page aloud, clear and steady.", keywords: ["read", "aloud"], department: "Voice" },
      ],
    },
    {
      theme: "Body & Movement",
      outcome: "stand tall, balance, and move with purpose.",
      days: [
        { purpose: "Find your neutral stance.", keywords: ["stance", "neutral"], department: "Body" },
        { purpose: "Reset your posture — shoulders back, chin level.", keywords: ["posture"], department: "Body" },
        { purpose: "Walk the room — every step counted.", keywords: ["walk"], department: "Body" },
        { purpose: "Character centre — move from one place.", keywords: ["character", "centre"], department: "Movement" },
        { purpose: "Rhythm walk — move to a beat.", keywords: ["rhythm", "walk"], department: "Movement" },
      ],
    },
    {
      theme: "Emotion & Imagination",
      outcome: "feel it honestly and imagine the room around you.",
      days: [
        { purpose: "Sense memory — a cup of tea.", keywords: ["sense", "tea"], department: "Emotion" },
        { purpose: "Joy in the body — where does it live?", keywords: ["joy"], department: "Emotion" },
        { purpose: "Object transformation — one thing becomes another.", keywords: ["object", "transformation"], department: "Imagination" },
        { purpose: "The invisible room — see it, live in it.", keywords: ["invisible", "room"], department: "Imagination" },
        { purpose: "The silent scene — no words, all feeling.", keywords: ["silent", "scene"], department: "Emotion" },
      ],
    },
    {
      theme: "Camera & Audition",
      outcome: "give a clean on-camera take and a full mock audition.",
      days: [
        { purpose: "Make the lens your friend.", keywords: ["lens", "friend"], department: "Camera" },
        { purpose: "Check your framing — head, shoulders, space.", keywords: ["framing"], department: "Camera" },
        { purpose: "Choose your monologue.", keywords: ["monologue", "choice"], department: "Audition" },
        { purpose: "The first ten seconds — win the room fast.", keywords: ["first", "ten"], department: "Audition" },
        { purpose: "Final take: record, review, keep your best.", keywords: ["mock", "take"], department: "Audition" },
      ],
    },
  ],
};

/** Generic fallback for departments without a written curriculum
 *  (Imagination, Movement, Mind, Career — reachable via custom plans). */
function genericCurriculum(department: string): Curriculum {
  return {
    outcome: `practise ${department.toLowerCase()} every day with confidence — the basics solid, the harder work done, and a real performance at the end.`,
    stages: [
      {
        theme: "Foundations",
        outcome: "do the basic moves of this craft with confidence.",
        days: [
          { purpose: "Warm up the basics.", keywords: [] },
          { purpose: "Practise the core technique, slowly.", keywords: [] },
          { purpose: "Repeat the basics until they feel easy.", keywords: [] },
          { purpose: "Combine two basics in one go.", keywords: [] },
          { purpose: "Your best basics of the week.", keywords: [] },
        ],
      },
      {
        theme: "Building the Skill",
        outcome: "practise the core techniques every day.",
        days: [
          { purpose: "Stretch a little further than last week.", keywords: [] },
          { purpose: "Practise the core technique at speed.", keywords: [] },
          { purpose: "Add one harder exercise.", keywords: [] },
          { purpose: "Combine technique with feeling.", keywords: [] },
          { purpose: "Your best take of the week.", keywords: [] },
        ],
      },
      {
        theme: "Deepening the Work",
        outcome: "take on harder exercises and hold the standard.",
        days: [
          { purpose: "The hardest exercise of the set.", keywords: [] },
          { purpose: "Practise under a little pressure.", keywords: [] },
          { purpose: "Mix two skills in one exercise.", keywords: [] },
          { purpose: "Review what has improved.", keywords: [] },
          { purpose: "Your best take of the week.", keywords: [] },
        ],
      },
      {
        theme: "Practice & Performance",
        outcome: "put it all together in a real performance.",
        days: [
          { purpose: "Run the full routine, start to finish.", keywords: [] },
          { purpose: "Perform it once, watch it back.", keywords: [] },
          { purpose: "Fix the one weakest moment.", keywords: [] },
          { purpose: "Your best take of the week.", keywords: [] },
          { purpose: "Final performance — the whole thing.", keywords: [] },
        ],
      },
    ],
  };
}

const CURRICULA: Record<string, Curriculum> = {
  Voice: VOICE,
  Body: BODY,
  Camera: CAMERA,
  Audition: AUDITION,
  Emotion: EMOTION,
  Dialect: DIALECT,
  "All departments": ALL_DEPARTMENTS,
};

function curriculumFor(department: string): Curriculum {
  return CURRICULA[department] ?? genericCurriculum(department);
}

/* ------------------------------------------------------------------ */
/* Exercise picking — deterministic, so the timetable never changes    */
/* between renders. Keyword matches for the day's purpose come         */
/* first; within a week, unused exercises are preferred; a stable      */
/* rotation keeps neighbouring days different.                         */
/* ------------------------------------------------------------------ */

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function allowedLevels(
  planLevel: Level | "All levels",
  weekIndex: number,
): Level[] {
  if (planLevel === "All levels") return ["Beginner", "Intermediate", "Advanced"];
  if (planLevel === "Beginner") {
    return weekIndex < 2 ? ["Beginner"] : ["Beginner", "Intermediate"];
  }
  return weekIndex < 2 ? ["Intermediate"] : ["Intermediate", "Advanced"];
}

function pickDayExercises(
  pool: Exercise[],
  keywords: string[],
  allowed: Level[],
  targetMinutes: number,
  usedIds: Set<string>,
  seed: number,
): Exercise[] {
  const eligible = pool.filter((e) => allowed.includes(e.level));
  const base = eligible.length > 0 ? eligible : pool;
  const scored = base.map((e, i) => {
    const text = `${e.title} ${e.description}`.toLowerCase();
    const kw = keywords.reduce(
      (n, k) => n + (text.includes(k.toLowerCase()) ? 1 : 0),
      0,
    );
    return { e, kw, used: usedIds.has(e.id), rot: (i + seed) % base.length };
  });
  scored.sort(
    (a, b) =>
      b.kw - a.kw || (a.used ? 1 : 0) - (b.used ? 1 : 0) || a.rot - b.rot,
  );
  const picked: Exercise[] = [];
  let total = 0;
  for (const c of scored) {
    if (total >= targetMinutes - 2) break;
    if (total + c.e.minutes > targetMinutes + 4) continue;
    picked.push(c.e);
    total += c.e.minutes;
  }
  // Still short: add the shortest remaining exercise even if it overshoots.
  if (total < targetMinutes - 5) {
    const rest = scored
      .filter((c) => !picked.includes(c.e))
      .sort((a, b) => a.e.minutes - b.e.minutes);
    for (const c of rest) {
      if (total >= targetMinutes - 2) break;
      picked.push(c.e);
      total += c.e.minutes;
    }
  }
  // Keep at least 2 exercises per day when the pool allows it.
  if (picked.length < 2) {
    for (const c of scored) {
      if (picked.length >= 2) break;
      if (!picked.includes(c.e)) {
        picked.push(c.e);
        total += c.e.minutes;
      }
    }
  }
  picked.forEach((e) => usedIds.add(e.id));
  return picked;
}

/** Which curriculum stage a week uses. First week = stage 0, last week =
 *  the final stage, middle weeks cycle through the middle stages. */
function stageForWeek(weekIndex: number, totalWeeks: number, stageCount: number): number {
  if (weekIndex === 0) return 0;
  if (weekIndex === totalWeeks - 1) return stageCount - 1;
  const middle = stageCount - 2;
  if (middle <= 0) return stageCount - 1;
  return 1 + ((weekIndex - 1) % middle);
}

export function buildTimetable(input: PlanInput): BuiltTimetable {
  const curriculum = curriculumFor(input.department);
  const seedBase = hashSeed(input.id);
  const weeks: TimetableWeek[] = [];
  for (let w = 0; w < input.weeks; w++) {
    const stage = curriculum.stages[stageForWeek(w, input.weeks, curriculum.stages.length)];
    const usedIds = new Set<string>();
    const days: TimetableDay[] = stage.days.map((day, d) => {
      const dept = day.department ?? (input.department === "All departments" ? "Voice" : input.department);
      const pool = EXERCISES.filter((e) => e.department === dept);
      const allowed = allowedLevels(input.level, w);
      const exercises = pickDayExercises(
        pool,
        day.keywords,
        allowed,
        input.minutesPerDay,
        usedIds,
        seedBase + w * 31 + d * 7,
      );
      return {
        dayIndex: d,
        label: DAY_LABELS[d],
        // Date is filled in by the caller (needs the enrolment date).
        date: new Date(0),
        purpose: day.purpose,
        exercises,
        totalMinutes: exercises.reduce((n, e) => n + e.minutes, 0),
      };
    });
    weeks.push({ week: w + 1, theme: stage.theme, outcome: stage.outcome, days });
  }
  return { weeks, planOutcome: curriculum.outcome };
}

/* ------------------------------------------------------------------ */
/* Dates — weeks run Monday–Friday. Week 1 is the calendar week the    */
/* user enrolled in; the current week is counted from that Monday.     */
/* ------------------------------------------------------------------ */

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function mondayOfWeek(d: Date): Date {
  const day = startOfDay(d);
  const diff = (day.getDay() + 6) % 7; // Monday = 0
  return new Date(day.getTime() - diff * DAY_MS);
}

/** Monday–Friday dates of a week (weekIndex 0 = enrolment week). */
export function weekDates(enrolledAtIso: string, weekIndex: number): Date[] {
  const monday = mondayOfWeek(new Date(enrolledAtIso));
  return [0, 1, 2, 3, 4].map(
    (i) => new Date(monday.getTime() + (weekIndex * 7 + i) * DAY_MS),
  );
}

/** 1-based current week from the real enrolment date, capped at the
 *  plan's weeks. Returns 1 when not enrolled / no date. */
export function currentWeekFrom(
  enrolledAtIso: string | null,
  weeks: number,
  now: Date = new Date(),
): number {
  if (!enrolledAtIso) return 1;
  const monday = mondayOfWeek(new Date(enrolledAtIso));
  const elapsed = Math.floor(
    (startOfDay(now).getTime() - monday.getTime()) / (7 * DAY_MS),
  );
  return Math.min(weeks, Math.max(1, elapsed + 1));
}

export function formatDayDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatEnrolledDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */
/* Resolving enrolments to plans, and done-marks from real sessions.   */
/* ------------------------------------------------------------------ */

export function resolvePlanInput(row: EnrollmentRow): PlanInput | null {
  if (row.plan_id !== "custom") {
    const plan = PLANS.find((p) => p.id === row.plan_id);
    if (!plan) return null;
    return {
      id: plan.id,
      title: plan.title,
      department: plan.department,
      weeks: plan.weeks,
      level: plan.level,
      minutesPerDay: plan.minutesPerDay,
      description: plan.description,
    };
  }
  try {
    const d = JSON.parse(row.custom_details ?? "{}") as {
      department?: Department | "All departments";
      minutesPerDay?: number;
      weeks?: number;
    };
    return {
      id: `custom-${row.id}`,
      title: row.plan_title,
      department: d.department ?? "All departments",
      weeks: d.weeks ?? 4,
      level: "All levels",
      minutesPerDay: d.minutesPerDay ?? 20,
      description: "Your own custom plan.",
    };
  } catch {
    return null;
  }
}

export function builtinPlanInput(plan: TrainingPlan): PlanInput {
  return {
    id: plan.id,
    title: plan.title,
    department: plan.department,
    weeks: plan.weeks,
    level: plan.level,
    minutesPerDay: plan.minutesPerDay,
    description: plan.description,
  };
}

/** Detail-page link for an enrolment row. */
export function enrollmentDetailHref(row: EnrollmentRow): string {
  if (row.plan_id === "custom") return `/plans/custom/${row.id}`;
  return `/plans/${row.plan_id}`;
}

/** Deep link into the Timer for one exercise (auto-starts on arrival). */
export function timerLink(ex: Exercise): string {
  const params = new URLSearchParams({
    exercise: ex.title,
    department: ex.department,
    minutes: String(ex.minutes),
  });
  return `/timer?${params.toString()}`;
}

export interface SessionLike {
  exercise_title: string;
  created_at: string;
}

/** A day counts as done ONLY when a real saved session on that exact
 *  date has the title of one of the day's planned exercises. Anything
 *  else is never marked done — no fake progress. */
export function isDayDone(
  date: Date,
  dayExercises: Exercise[],
  sessions: SessionLike[],
): boolean {
  const key = dayKey(date);
  const titles = new Set(dayExercises.map((e) => e.title));
  return sessions.some(
    (s) => dayKey(new Date(s.created_at)) === key && titles.has(s.exercise_title),
  );
}
