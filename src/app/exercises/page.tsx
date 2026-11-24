"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENTS, EXERCISES, exercisesFor } from "@/data/exercises";
import type { Department } from "@/data/exercises";

type Filter = Department | "All";

export default function ExercisesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const list = exercisesFor(filter);

  function startWithTimer(exerciseId: string) {
    const ex = EXERCISES.find((e) => e.id === exerciseId);
    if (!ex) return;
    const params = new URLSearchParams({
      exercise: ex.title,
      department: ex.department,
      minutes: String(ex.minutes),
    });
    router.push(`/timer?${params.toString()}`);
  }

  return (
    <section className="section">
      <h2>Exercise Library</h2>
      <p className="sub">
        {EXERCISES.length} exercises across {DEPARTMENTS.length} departments.
        Tap a department to filter. Every exercise runs with the built-in
        timer: 1. Pick a time 2. Press Start 3. It saves by itself.
      </p>
      <div className="filters" role="group" aria-label="Filter by department">
        {(["All", ...DEPARTMENTS] as Filter[]).map((d) => (
          <button
            key={d}
            type="button"
            className="fbtn"
            aria-pressed={filter === d}
            onClick={() => setFilter(d)}
          >
            {d}
            {d !== "All" ? ` (${exercisesFor(d).length})` : ""}
          </button>
        ))}
      </div>
      <p className="sub" aria-live="polite">
        Showing {list.length} exercise{list.length === 1 ? "" : "s"}.
      </p>
      <div className="grid">
        {list.map((ex) => (
          <article key={ex.id} className="card">
            <span className="chip">{ex.department}</span>
            <h3>{ex.title}</h3>
            <p>{ex.description}</p>
            <div className="meta">
              <span>{ex.minutes} min</span>
              <span>{ex.level}</span>
            </div>
            <div className="rowbtns">
              <button
                type="button"
                className="btn btn-line"
                onClick={() => startWithTimer(ex.id)}
              >
                Start with timer
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
