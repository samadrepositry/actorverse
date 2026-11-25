"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { href: string; label: string; icon: string };

/* Simple inline SVG icons (stroke style, no emoji). */
const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 3l9 8.5" /><path d="M5.5 10.5V21h13V10.5" /><path d="M9.5 21v-6h5v6" /></svg>
  ),
  exercises: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /><path d="M4 20.5V5.5" /><path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4.5" /></svg>
  ),
  timer: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9.5V13l2.5 2M9.5 2.5h5" /></svg>
  ),
  teleprompter: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
  ),
  studio: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="13" height="12" rx="2" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></svg>
  ),
  scripts: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8L19.5 8v13.5H6Z" /><path d="M13.5 2.5V8H19.5M9 12.5h6M9 16h6" /></svg>
  ),
  monologues: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12Z" /><path d="M8.5 11h7M8.5 14.5h4.5" /></svg>
  ),
  plans: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4M8 14.5l2.5 2.5L16 11.5" /></svg>
  ),
  coach: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3-6.3-2.2 6.3-2.2Z" /><path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z" /></svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v16h16" /><path d="M8.5 16.5v-5M13 16.5V8.5M17.5 16.5v-3" /></svg>
  ),
  achievements: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" /></svg>
  ),
  community: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.5a6.5 6.5 0 0 1 4 5.5" /></svg>
  ),
  auditions: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 14-5v12L3 13Z" /><path d="M17 8.5a4 4 0 0 1 0 7M7 13.5V17a2 2 0 0 0 4 0v-2.5" /></svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8 7.5 10 4.3-2 7.5-5.4 7.5-10v-6Z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></svg>
  ),
};

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/exercises", label: "Exercises", icon: "exercises" },
  { href: "/timer", label: "Timer", icon: "timer" },
  { href: "/teleprompter", label: "Teleprompter", icon: "teleprompter" },
  { href: "/studio", label: "Studio", icon: "studio" },
  { href: "/scripts", label: "Scripts", icon: "scripts" },
  { href: "/monologues", label: "Monologues", icon: "monologues" },
  { href: "/plans", label: "Plans", icon: "plans" },
  { href: "/coach", label: "AI Coach", icon: "coach" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/achievements", label: "Achievements", icon: "achievements" },
  { href: "/community", label: "Community", icon: "community" },
  { href: "/auditions", label: "Auditions", icon: "auditions" },
];

const ADMIN_NAV: NavItem = { href: "/admin", label: "Admin", icon: "admin" };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Esc closes the mobile drawer.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const navList = (
    <nav className="sidebar-nav" aria-label="Main">
      {MAIN_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            "sidebar-link" + (isActive(pathname, item.href) ? " active" : "")
          }
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <span className="sidebar-icon">{ICONS[item.icon]}</span>
          {item.label}
        </Link>
      ))}
      <div className="sidebar-divider" aria-hidden="true" />
      <Link
        href={ADMIN_NAV.href}
        className={
          "sidebar-link" +
          (isActive(pathname, ADMIN_NAV.href) ? " active" : "")
        }
        aria-current={isActive(pathname, ADMIN_NAV.href) ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        <span className="sidebar-icon">{ICONS[ADMIN_NAV.icon]}</span>
        {ADMIN_NAV.label}
      </Link>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="topbar">
        <button
          type="button"
          className="hamburger"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link href="/" className="brand topbar-brand" onClick={() => setOpen(false)}>
          ACTORVERSE
        </Link>
        <span className="topbar-spacer" aria-hidden="true" />
      </div>

      {/* Overlay (mobile drawer only) */}
      {open && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={"sidebar" + (open ? " open" : "")} aria-label="App menu">
        <div className="sidebar-head">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            ACTORVERSE
          </Link>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
        {navList}
        <div className="sidebar-foot">
          {signedIn ? (
            <button
              type="button"
              className="sidebar-signout"
              onClick={handleSignOut}
            >
              <span className="sidebar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M14 4h-8v16h8M10 12h11M18 8l4 4-4 4" /></svg>
              </span>
              Sign out
            </button>
          ) : (
            <Link
              href="/#signin"
              className="sidebar-signout"
              onClick={() => setOpen(false)}
            >
              <span className="sidebar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M10 4H6v16h4M14 8l4 4-4 4M18 12H9" /></svg>
              </span>
              Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
