"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function GoalSetter({
  currentGoal,
}: {
  currentGoal: number;
}) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(String(currentGoal));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const value = Number(minutes);
    if (!Number.isFinite(value) || value < 0 || value > 10080) {
      setError("Enter a goal between 0 and 10,080 minutes per week.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You are not signed in.");
      const { error } = await supabase.from("weekly_goals").upsert({
        user_id: user.id,
        minutes_per_week: value,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setMessage("Weekly goal saved.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the goal.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSave}>
      <div>
        <label htmlFor="weekly-goal">Weekly goal (minutes per week)</label>
        <input
          id="weekly-goal"
          type="number"
          min={0}
          max={10080}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <button type="submit" className="btn btn-gold" disabled={busy}>
        {busy ? "Saving…" : "Save goal"}
      </button>
    </form>
  );
}
