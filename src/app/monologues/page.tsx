// ACTORVERSE — Monologues library (Phase 3)
// All 14 original monologues. Read any of them here, or send one to the
// Teleprompter to perform it on camera.

import Link from "next/link";
import { MONOLOGUES } from "@/data/monologues";

export default function MonologuesPage() {
  return (
    <section className="section" data-page="monologues">
      <h2>Monologues</h2>
      <p className="sub">
        {MONOLOGUES.length} original monologues to practise with. Each takes
        about 1–2 minutes to perform aloud. Tap “Read” to open one, or send
        it straight to the Teleprompter.
      </p>

      <div className="grid">
        {MONOLOGUES.map((m) => (
          <article key={m.id} className="card">
            <span className="chip">Monologue</span>
            <h3>{m.title}</h3>
            <p>{m.character}</p>
            <details style={{ marginTop: 10 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "var(--gold)",
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Read
              </summary>
              <p
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                  marginTop: 10,
                }}
              >
                {m.text}
              </p>
            </details>
            <div className="rowbtns">
              <Link
                href={`/teleprompter?monologue=${m.id}`}
                className="btn btn-gold"
              >
                Send to Teleprompter
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
