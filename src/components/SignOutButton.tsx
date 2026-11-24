"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="btn btn-ghost"
      style={{ minHeight: 44, padding: "8px 16px" }}
    >
      Sign out
    </button>
  );
}
