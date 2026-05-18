"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const navSections = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "space_dashboard" },
      { label: "Train", href: "/train", icon: "fitness_center" },
      { label: "Compete", href: "/compete", icon: "swords" },
      { label: "Library", href: "/learn", icon: "menu_book" },
    ],
  },
  {
    label: "MORE",
    items: [
      { label: "Contests", href: "/contests", icon: "emoji_events" },
      { label: "Friends", href: "/friends", icon: "group" },
      { label: "Upsolve", href: "/upsolve", icon: "history" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", href: "/profile/me", icon: "person", dynamic: true },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userHandle = session?.user?.cfHandle || session?.user?.name || "me";

  return (
    <aside
      className="hidden lg:flex"
      style={{
        flexDirection: "column",
        gap: 16,
        padding: "24px 16px",
        width: 220,
        flexShrink: 0,
        background: "var(--surface-low)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {navSections.map((section, si) => (
        <div key={si} style={{ marginTop: si === navSections.length - 1 ? "auto" : 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--text-faint)",
            padding: "0 12px", marginBottom: 6,
          }}>
            {section.label}
          </div>
          {section.items.map((item) => {
            const href = item.dynamic ? `/profile/${userHandle}` : item.href;
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  background: isActive ? "var(--primary-light)" : "transparent",
                  transition: "all 0.15s",
                  marginBottom: 2,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 18,
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
