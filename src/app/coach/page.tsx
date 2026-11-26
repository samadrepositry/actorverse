// ACTORVERSE — AI Coach (Phase 4)
// A simple chat with the AI acting coach, in English or Urdu. The Coach
// runs on Gemini on the server. If no Gemini key is set up yet, the page
// says so honestly — it never fakes an answer.

"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";

interface ChatMsg {
  role: "user" | "coach";
  text: string;
}

// Render **bold** and line breaks in a coach reply, without any raw HTML
// from the model: the text is split into plain segments and React renders
// them, so nothing from the model ever becomes markup.
function renderRich(text: string) {
  return text.split("\n").map((line, li) => (
    <span key={li} style={{ display: "block" }}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={pi}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={pi}>{part}</span>
        ),
      )}
    </span>
  ));
}

type CoachLanguage = "en" | "ur" | "es";

const UI_STRINGS: Record<
  CoachLanguage,
  { empty: string; label: string; placeholder: string }
> = {
  en: {
    empty: "Pick a question below, or write your own.",
    label: "Write your question",
    placeholder: "e.g. My voice feels weak — what should I do?",
  },
  ur: {
    empty: "Neeche se ek sawal chunein, ya apna sawal likhein.",
    label: "Apna sawal likhein",
    placeholder: "Jaise: meri awaz kamzor hai, kya karoon?",
  },
  es: {
    empty: "Elige una pregunta abajo, o escribe la tuya.",
    label: "Escribe tu pregunta",
    placeholder: "Ej.: Mi voz se siente débil, ¿qué debo hacer?",
  },
};

const STARTERS: { en: string; ur: string; es: string }[] = [
  {
    en: "How do I stop feeling nervous before an audition?",
    ur: "Audition se pehle ghabrahat kaise khatam karoon?",
    es: "¿Cómo dejo de sentirme nervioso antes de una audición?",
  },
  {
    en: "Give me one voice warm-up I can do every morning.",
    ur: "Mujhe subah ke liye ek voice warm-up batao.",
    es: "Dame un calentamiento de voz que pueda hacer cada mañana.",
  },
  {
    en: "How can I make my monologue feel more real?",
    ur: "Apna monologue zyada real kaise banao?",
    es: "¿Cómo puedo hacer que mi monólogo se sienta más real?",
  },
];

export default function CoachPage() {
  const [language, setLanguage] = useState<CoachLanguage>("en");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateNote, setTranslateNote] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Switch the chat language and translate the existing coach answers into
  // the new language, so the whole conversation switches — not just new
  // questions. The user's own messages are left exactly as written and
  // are never translated. If a translation fails, that answer stays in its
  // original language and a small note says so.
  async function switchLanguage(target: CoachLanguage) {
    if (target === language || translating || busy) return;
    setLanguage(target);
    setTranslateNote(null);
    const coachIndexes = messages
      .map((m, i) => (m.role === "coach" ? i : -1))
      .filter((i) => i >= 0);
    if (coachIndexes.length === 0) return;
    setTranslating(true);
    try {
      const translated = await Promise.all(
        coachIndexes.map(async (i) => {
          try {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: messages[i].text, target }),
            });
            const data = await res.json();
            if (!res.ok || typeof data?.text !== "string" || !data.text.trim()) {
              return null;
            }
            return data.text as string;
          } catch {
            return null;
          }
        }),
      );
      let failed = false;
      const next = messages.map((m, i) => {
        const pos = coachIndexes.indexOf(i);
        if (pos < 0) return m;
        if (translated[pos] === null) {
          failed = true;
          return m;
        }
        return { ...m, text: translated[pos] as string };
      });
      setMessages(next);
      if (failed) {
        setTranslateNote(
          "Translation did not work — the original answer is shown.",
        );
      }
    } finally {
      setTranslating(false);
    }
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", text: clean }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          language,
          history: next.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "not_connected") setNotConnected(true);
        setError(data?.error || "The AI Coach could not answer. Try again.");
        return;
      }
      setMessages([...next, { role: "coach", text: data.reply as string }]);
    } catch {
      setError("The AI Coach could not be reached. Check your connection.");
    } finally {
      setBusy(false);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }

  return (
    <section className="section" data-page="coach">
      <div className="page-head" style={{ paddingTop: 0 }}>
        <span className="eyebrow">Mentorship</span>
        <h1>AI Coach</h1>
        <span className="accent-bar" aria-hidden="true" />
        <p>
          Ask your acting coach anything — voice, body, camera, auditions.
          Simple answers, one practical exercise at a time.
        </p>
      </div>

      {notConnected && (
        <p className="note">
          <strong>AI Coach is not connected yet.</strong> The app owner needs
          to add a Gemini API key (GEMINI_API_KEY) on the server. Until then
          the Coach cannot answer — and it will not pretend to.
        </p>
      )}

      <div
        className="tabs"
        role="group"
        aria-label="Coach language"
        style={{ marginTop: 0, marginBottom: 12 }}
      >
        <button
          type="button"
          className="fbtn tab"
          aria-pressed={language === "en"}
          aria-selected={language === "en"}
          disabled={translating || busy}
          onClick={() => void switchLanguage("en")}
        >
          English
        </button>
        <button
          type="button"
          className="fbtn tab"
          aria-pressed={language === "ur"}
          aria-selected={language === "ur"}
          disabled={translating || busy}
          onClick={() => void switchLanguage("ur")}
        >
          اردو
        </button>
        <button
          type="button"
          className="fbtn tab"
          aria-pressed={language === "es"}
          aria-selected={language === "es"}
          disabled={translating || busy}
          onClick={() => void switchLanguage("es")}
        >
          Español
        </button>
      </div>

      {translating && (
        <p className="sub" role="status" style={{ marginTop: 0 }}>
          Translating…
        </p>
      )}
      {translateNote && (
        <p className="note" role="status" style={{ marginTop: 0 }}>
          {translateNote}
        </p>
      )}

      <div
        className="card card-accent"
        style={
          {
            "--card-accent": "#ff9a5c",
            "--card-soft": "rgba(255, 154, 92, 0.10)",
          } as CSSProperties
        }
      >
        <div className="chat-log" ref={listRef}>
          {messages.length === 0 && (
            <p className="sub" style={{ marginBottom: 0 }}>
              {UI_STRINGS[language].empty}
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-msg ${m.role === "user" ? "chat-user" : "chat-coach"}`}
              style={
                m.role === "coach"
                  ? { borderLeft: "3px solid var(--gold)" }
                  : undefined
              }
            >
              <strong>{m.role === "user" ? "You" : "Coach"}</strong>
              {m.role === "coach" ? (
                <p>{renderRich(m.text)}</p>
              ) : (
                <p>{m.text}</p>
              )}
            </div>
          ))}
          {busy && (
            <p className="sub" style={{ marginBottom: 0 }}>
              <span className="spinner spinner-light" aria-hidden="true" />{" "}
              Coach is thinking…
            </p>
          )}
        </div>
        <div className="form" style={{ marginTop: 12 }}>
          <label htmlFor="coach-input" className="field-label">
            {UI_STRINGS[language].label}
          </label>
          <textarea
            id="coach-input"
            className="field"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={UI_STRINGS[language].placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-gold"
            disabled={busy || !input.trim()}
            onClick={() => void send(input)}
          >
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" /> Thinking…
              </>
            ) : (
              "Ask the Coach"
            )}
          </button>
        </div>
        {error && (
          <p className="error" role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>

      <div className="card card-flat" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Try one of these</h3>
        <div className="rowbtns" style={{ marginTop: 0 }}>
          {STARTERS.map((s) => (
            <button
              key={s.en}
              type="button"
              className="btn btn-line"
              disabled={busy}
              onClick={() => void send(s[language])}
            >
              {s[language]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
