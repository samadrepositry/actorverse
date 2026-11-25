import type { Metadata } from "next";
import "./globals.css";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/components/Sidebar";
import ToastHost from "@/components/Toast";

export const metadata: Metadata = {
  title: "ACTORVERSE — Train Like an Athlete. Perform Like a Legend.",
  description:
    "A complete training ground for actors — voice, body, camera and auditions — in one app. 170 exercises across 10 departments.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <Sidebar signedIn={!!user} />
        <ToastHost />
        <div className="app-shell">
          <main className="container">{children}</main>
          <footer>
            ACTORVERSE — Train Like an Athlete. Perform Like a Legend.
          </footer>
        </div>
      </body>
    </html>
  );
}
