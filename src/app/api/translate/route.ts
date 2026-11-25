// ACTORVERSE — Translation API
// Translates a piece of text into English or Urdu (Urdu script) for the
// AI Coach language switch. Same Gemini key and model fallback as the Coach
// route. If no key is set, or every model fails, it says so honestly —
// it never fakes a translation.

import { NextResponse } from "next/server";

const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_TIMEOUT_MS = 20000;
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Translation is not connected yet. The app owner needs to add a Gemini API key (GEMINI_API_KEY) on the server.",
        code: "not_connected",
      },
      { status: 503 },
    );
  }

  let body: { text?: unknown; target?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send text to translate." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Send text to translate." }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Keep the text under 2000 characters." },
      { status: 400 },
    );
  }
  const target = body.target === "ur" ? "ur" : "en";

  // Translate faithfully and simply. For Urdu, always use Urdu script
  // (اردو) — never Roman Urdu. Reply with ONLY the translation, no
  // explanation and no extra text. If the text is already in the target
  // language, return it unchanged.
  const systemPrompt =
    target === "ur"
      ? "You are a translator. Translate the user's text into Urdu, using Urdu script (اردو) for every word. Never use Roman Urdu. Keep the meaning exactly, keep it simple and natural. Reply with ONLY the translation — no explanation, no extra text, no quotation marks around it. If the text is already in Urdu script, return it unchanged."
      : "You are a translator. Translate the user's text into simple, easy English. Keep the meaning exactly, keep it simple and natural. Reply with ONLY the translation — no explanation, no extra text, no quotation marks around it. If the text is already in English, return it unchanged.";

  // Same fallback as the Coach route: an overloaded model (503), a rate
  // limit (429), a model this key cannot use (404), a timeout, or an empty
  // reply moves to the next model. A key/permission problem (400/401/403)
  // would fail the same way on every model, so it is returned straight away.
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
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text }] }],
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
          { error: `Translation did not work: ${lastError}` },
          { status: 502 },
        );
      }
      const translated: string | undefined =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim();
      if (!translated) {
        lastError = "The translation came back empty.";
        continue;
      }
      return NextResponse.json({ text: translated });
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.message
          : "The translation service could not be reached.";
      continue;
    }
  }
  return NextResponse.json(
    { error: `Translation did not work: ${lastError}` },
    { status: 502 },
  );
}
