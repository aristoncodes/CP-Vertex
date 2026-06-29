"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useUIStore } from "@/store/useUIStore";

/**
 * The single left navigation rail — the one source of truth for navigation
 * (replaces the old TopBar nav-row + the dead Sidebar). Fixed rail on desktop;
 * slides in as a drawer under 1024px (state in useUIStore.sidebarOpen, toggled
 * from the TopBar hamburger).
 */
const PRIMARY = [
  { label: "Home", href: "/dashboard", icon: "space_dashboard" },
  { label: "Train", href: "/train", icon: "fitness_center" },
  { label: "Compete", href: "/compete", icon: "swords" },
  { label: "Analyze", href: "/analysis", icon: "analytics" },
  { label: "Learn", href: "/learn", icon: "menu_book" },
];

const SECONDARY = [
  { label: "Contests", href: "/contests", icon: "emoji_events" },
  { label: "Friends", href: "/friends", icon: "group" },
  { label: "Upsolve", href: "/upsolve", icon: "history" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ href, icon, label, active, onClick }: {
  href: string; icon: string; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`n-nav-item${active ? " n-nav-item--active" : ""}`}
      style={{ fontSize: "var(--text-md)", marginBottom: 2 }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 20, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userHandle = session?.user?.cfHandle || session?.user?.name || "me";
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const close = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={close}
          className="sidebar-overlay"
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.4)",
          }}
        />
      )}

      <aside
        className={`app-sidebar${sidebarOpen ? " app-sidebar--open" : ""}`}
        style={{
          display: "flex", flexDirection: "column",
          width: 224, flexShrink: 0,
          background: "var(--surface-low)",
          borderRight: "1px solid var(--border)",
          padding: "16px 12px",
        }}
      >
        {/* Brand */}
        <Link
          href="/dashboard"
          onClick={close}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 18px", textDecoration: "none" }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em",
          }}>CV</div>
          <span style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            CP-Vertex
          </span>
        </Link>

        {/* Primary nav */}
        <nav style={{ display: "flex", flexDirection: "column" }}>
          {PRIMARY.map((item) => (
            <NavLink key={item.href} {...item} active={isActivePath(pathname, item.href)} onClick={close} />
          ))}
        </nav>

        {/* Secondary nav */}
        <div className="n-section-label" style={{ padding: "0 12px", marginTop: 18, marginBottom: 4 }}>More</div>
        <nav style={{ display: "flex", flexDirection: "column" }}>
          {SECONDARY.map((item) => (
            <NavLink key={item.href} {...item} active={isActivePath(pathname, item.href)} onClick={close} />
          ))}
        </nav>

        {/* Footer: profile / settings / theme */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2, paddingTop: 12 }}>
          <NavLink href={`/profile/${userHandle}`} icon="person" label="Profile" active={pathname.startsWith("/profile")} onClick={close} />
          <NavLink href="/settings" icon="settings" label="Settings" active={isActivePath(pathname, "/settings")} onClick={close} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px" }}>
            <ThemeToggle />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Theme</span>
          </div>
        </div>
      </aside>
    </>
  );
}
