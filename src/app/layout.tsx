import type { Metadata } from "next";
import "./globals.css";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/components/Sidebar";
import ToastHost from "@/components/Toast";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "ACTORVERSE — Train Like an Athlete. Perform Like a Legend.",
  description:
    "A complete training ground for actors — voice, body, camera and auditions — in one app. 170 exercises across 10 departments.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0a0805",
  appleWebApp: { capable: true, title: "ACTORVERSE", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
  },
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
        <ServiceWorkerRegister />
        <Sidebar signedIn={!!user} />
        <ToastHost />
        <div className="app-shell">
          <main className="container">{children}</main>
          <footer className="site-footer">
            ACTORVERSE — Train Like an Athlete. Perform Like a Legend.
          </footer>
        </div>
      </body>
    </html>
  );
}
