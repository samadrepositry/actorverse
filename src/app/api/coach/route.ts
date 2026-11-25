// ACTORVERSE — AI Coach API (Phase 4)
// Server-only route: the Gemini API key is read from GEMINI_API_KEY on the
// server and never reaches the browser. If no key is set, the route says so
// honestly — the Coach never fakes an answer.

import { NextResponse } from "next/server";

const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_TIMEOUT_MS = 20000;
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT_EN = `You are the ACTORVERSE AI Coach, a kind and simple acting teacher for beginners in Pakistan. Reply in simple, easy English. Keep answers short (under 150 words). Give one practical exercise the student can do today. Never invent facts about the student. If a question is not about acting, voice, body, camera, auditions or stage work, say so in one line and steer back to acting.`;

const SYSTEM_PROMPT_UR = `You are the ACTORVERSE AI Coach, a kind and simple acting teacher for beginners in Pakistan. Reply in simple, easy Urdu (Urdu script). Keep answers short (under 150 words). Give one practical exercise the student can do today. Never invent facts about the student. If a question is not about acting, voice, body, camera, auditions or stage work, say so in one line and steer back to acting.`;

interface ChatMessage {
  role: "user" | "coach";
  text: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI Coach is not connected yet. The app owner needs to add a Gemini API key (GEMINI_API_KEY) on the server.",
        code: "not_connected",
      },
      { status: 503 },
    );
  }

  let body: { message?: unknown; language?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send a message first." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Send a message first." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Keep your message under 2000 characters." },
      { status: 400 },
    );
  }
  const language = body.language === "ur" ? "ur" : "en";
  const history = Array.isArray(body.history)
    ? (body.history as ChatMessage[])
        .filter((m) => m && typeof m.text === "string")
        .slice(-8)
    : [];

  const contents = [
    ...history.map((m) => ({
      role: m.role === "coach" ? "model" : "user",
      parts: [{ text: m.text.slice(0, 2000) }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  // Try each model in order. An overloaded model (503), a rate limit (429),
  // a model this key cannot use (404), a timeout, or an empty reply moves
  // to the next model. The first real reply wins. If every model fails, the
  // honest error from the last attempt is returned — never a fake answer.
  // A key/permission problem (400/401/403) would fail the same way on every
  // model, so it is returned straight away.
  let lastError = "Gemini did not answer.";
  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_API_BASE}/${model}:generateContent`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              { text: language === "ur" ? SYSTEM_PROMPT_UR : SYSTEM_PROMPT_EN },
            ],
          },
          contents,
        }),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      });
      const data = await res.json();
      if (!res.ok) {
        lastError =
          data?.error?.message || `Gemini returned status ${res.status}.`;
        if (res.status === 503 || res.status === 429 || res.status === 404) {
          continue;
        }
        return NextResponse.json(
          { error: `The AI Coach could not answer right now: ${lastError}` },
          { status: 502 },
        );
      }
      const reply: string | undefined =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim();
      if (!reply) {
        lastError = "The AI Coach gave an empty answer.";
        continue;
      }
      return NextResponse.json({ reply });
    } catch (err) {
      // Timeout (AbortSignal.timeout) or a network failure: fail fast and
      // try the next model.
      lastError =
        err instanceof Error
          ? err.message
          : "The AI Coach could not be reached.";
      continue;
    }
  }
  return NextResponse.json(
    { error: `The AI Coach could not answer right now: ${lastError}` },
    { status: 502 },
  );
}
