"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Minimal chrome for public, no-login pages (e.g. the `/u/[handle]` analyzer).
 * Unlike DashboardLayout it does NOT mount auto-sync, presence heartbeats, or
 * the authenticated app navigation — so it's safe to render for anonymous
 * visitors. Just a logo, theme toggle, and a sign-in entry point.
 */
export function PublicShell({
  children,
  isLoggedIn = false,
}: {
  children: React.ReactNode;
  isLoggedIn?: boolean;
}) {
  return (
    <div style={{ background: "var(--surface)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderBottom: "0.5px solid var(--border)",
          background: "var(--surface-card)", position: "sticky", top: 0, zIndex: 20,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 24 }}>swords</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            CP-Vertex
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle />
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="n-btn-primary"
            style={{ padding: "8px 18px", fontSize: 13 }}
          >
            {isLoggedIn ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      <main
        className="layout-main"
        style={{
          flex: 1, width: "100%", maxWidth: 1200, margin: "0 auto",
          padding: "28px 24px 80px", display: "flex", flexDirection: "column", gap: 24,
        }}
      >
        {children}
      </main>
    </div>
  );
}
