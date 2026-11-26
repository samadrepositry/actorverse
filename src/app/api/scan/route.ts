// ACTORVERSE — AI Scan API (Teleprompter)
// Server-only route: the Gemini API key is read from GEMINI_API_KEY on the
// server and never reaches the browser. The client sends one photo of a
// page; Gemini transcribes the words on it and nothing else. The photo is
// never logged and never saved anywhere. If no key is set, the route says
// so honestly — the scan never fakes a transcription.

import { NextResponse } from "next/server";

// Same verified model list as the AI Coach route. gemini-2.5-flash and
// gemini-2.0-flash are RETIRED (404 "no longer available", verified
// 2026-11-26) — removed. gemini-3.8-flash exists but was overloaded
// (503 "high demand" on two probes) and never returned a real answer
// within the 20s timeout, so it is left out for now.
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const GEMINI_TIMEOUT_MS = 20000;
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

// About 8 MB of image data, in base64 characters (base64 is 4 chars per
// 3 bytes, so 11,000,000 chars is about 8 MB).
const MAX_BASE64_LENGTH = 11_000_000;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const TRANSCRIBE_PROMPT = `Transcribe ALL the visible text on this page exactly as written, in the original language and script (Urdu, English, or both). Do NOT translate, do NOT summarise, do NOT add words, and do NOT correct spelling. Keep the line breaks as they appear on the page. If no text is visible on the page, reply with an empty string and nothing else.`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI scan is not connected yet. The app owner needs to add a Gemini API key (GEMINI_API_KEY) on the server.",
        code: "not_connected",
      },
      { status: 503 },
    );
  }

  let body: { image?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Send a photo of the page first." },
      { status: 400 },
    );
  }

  const image = typeof body.image === "string" ? body.image : "";
  const match = image.match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Send a photo of the page first." },
      { status: 400 },
    );
  }
  const mimeType = match[1];
  const base64 = match[2];
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { ok: false, error: "That photo format is not supported. Use a JPEG or PNG photo." },
      { status: 400 },
    );
  }
  if (base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "That photo is too large. Take a closer photo of fewer lines." },
      { status: 400 },
    );
  }

  // Try each model in order. An overloaded model (503), a rate limit
  // (429), a model this key cannot use (404), or a timeout moves to the
  // next model. A key/permission problem (400/401/403) would fail the
  // same way on every model, so it is returned straight away. A
  // successful reply is returned as-is — even an empty string, which
  // honestly means no text was visible on the page. Never a fake
  // transcription.
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
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: TRANSCRIBE_PROMPT },
              ],
            },
          ],
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
          { ok: false, error: "AI scan could not read the page right now. Please try again later." },
          { status: 502 },
        );
      }
      const text: string =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim() ?? "";
      return NextResponse.json({ ok: true, text });
    } catch (err) {
      // Timeout (AbortSignal.timeout) or a network failure: fail fast and
      // try the next model.
      lastError =
        err instanceof Error
          ? err.message
          : "AI scan could not be reached.";
      continue;
    }
  }
  // Every model failed. Log the raw error server-side for the owner,
  // but the user only ever sees a short friendly message.
  console.error("[scan] all models failed:", lastError);
  return NextResponse.json(
    { ok: false, error: "AI scan could not read the page right now. Please try again in a moment." },
    { status: 502 },
  );
}
