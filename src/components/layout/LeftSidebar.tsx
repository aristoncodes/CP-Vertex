"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "space_dashboard" },
  { label: "Train", href: "/train", icon: "fitness_center" },
  { label: "Compete", href: "/compete", icon: "swords" },
  { label: "Analysis", href: "/analysis", icon: "analytics" },
  { label: "Library", href: "/learn", icon: "menu_book" },
  { label: "Contests", href: "/contests", icon: "emoji_events" },
  { label: "Friends", href: "/friends", icon: "group" },
];

export function LeftSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="layout-sidebar-left"
      style={{
        width: 240,
        flexShrink: 0,
        padding: "32px 0 80px 0",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div className="n-section-label" style={{ paddingLeft: 16 }}>Navigation</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                background: isActive ? "var(--primary-light)" : "transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--surface-high)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
