// ACTORVERSE — AI Coach (Phase 4)
// A simple chat with the AI acting coach, in English or Urdu. The Coach
// runs on Gemini on the server. If no Gemini key is set up yet, the page
// says so honestly — it never fakes an answer.

"use client";

import { useRef, useState } from "react";

interface ChatMsg {
  role: "user" | "coach";
  text: string;
}

const STARTERS: { en: string; ur: string }[] = [
  {
    en: "How do I stop feeling nervous before an audition?",
    ur: "Audition se pehle ghabrahat kaise khatam karoon?",
  },
  {
    en: "Give me one voice warm-up I can do every morning.",
    ur: "Mujhe subah ke liye ek voice warm-up batao.",
  },
  {
    en: "How can I make my monologue feel more real?",
    ur: "Apna monologue zyada real kaise banao?",
  },
];

export default function CoachPage() {
  const [language, setLanguage] = useState<"en" | "ur">("en");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

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
    <section className="section">
      <h2>AI Coach</h2>
      <p className="sub">
        Ask your acting coach anything — voice, body, camera, auditions.
        Simple answers, one practical exercise at a time.
      </p>

      {notConnected && (
        <p className="note">
          <strong>AI Coach is not connected yet.</strong> The app owner needs
          to add a Gemini API key (GEMINI_API_KEY) on the server. Until then
          the Coach cannot answer — and it will not pretend to.
        </p>
      )}

      <div className="rowbtns" style={{ marginTop: 0, marginBottom: 12 }}>
        <button
          type="button"
          className="fbtn"
          aria-pressed={language === "en"}
          onClick={() => setLanguage("en")}
        >
          English
        </button>
        <button
          type="button"
          className="fbtn"
          aria-pressed={language === "ur"}
          onClick={() => setLanguage("ur")}
        >
          اردو
        </button>
      </div>

      <div className="card">
        <div className="chat-log" ref={listRef}>
          {messages.length === 0 && (
            <p className="sub">
              {language === "ur"
                ? "Neeche se ek sawal chunein, ya apna sawal likhein."
                : "Pick a question below, or write your own."}
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-msg ${m.role === "user" ? "chat-user" : "chat-coach"}`}
            >
              <strong>{m.role === "user" ? "You" : "Coach"}</strong>
              <p>{m.text}</p>
            </div>
          ))}
          {busy && (
            <p className="sub">Coach is thinking…</p>
          )}
        </div>
        <div className="form" style={{ marginTop: 12 }}>
          <label htmlFor="coach-input">
            {language === "ur" ? "Apna sawal likhein" : "Write your question"}
          </label>
          <textarea
            id="coach-input"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === "ur"
                ? "Jaise: meri awaz kamzor hai, kya karoon?"
                : "e.g. My voice feels weak — what should I do?"
            }
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
            {busy ? "Thinking…" : "Ask the Coach"}
          </button>
        </div>
        {error && (
          <p className="error" role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Try one of these</h3>
        <div className="rowbtns" style={{ marginTop: 0 }}>
          {STARTERS.map((s) => (
            <button
              key={s.en}
              type="button"
              className="btn btn-line"
              disabled={busy}
              onClick={() => void send(language === "ur" ? s.ur : s.en)}
            >
              {language === "ur" ? s.ur : s.en}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
