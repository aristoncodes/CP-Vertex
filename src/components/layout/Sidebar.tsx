"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    label: "NAVIGATE",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "🏠" },
      { label: "Problem Feed", href: "/problems", icon: "📋" },
      { label: "Practice Hub", href: "/practice", icon: "🧪" },
      { label: "Leaderboard", href: "/leaderboard", icon: "🏆" },
      { label: "My Profile", href: "/profile/arjun_cp", icon: "👤" },
      { label: "Team", href: "/team", icon: "👥" },
      { label: "Algorithms", href: "/learn", icon: "📚" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Settings", href: "/settings", icon: "⚙️" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col gap-4 p-6 w-[220px] shrink-0"
      style={{
        background: "var(--bg-raised)",
        borderRight: "1px solid var(--border-dim)",
      }}
    >
      {navSections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-auto" : ""}>
          <div
            className="mb-2 text-[9px] tracking-widest uppercase"
            style={{ fontFamily: "var(--font-code)", color: "var(--text-dim)" }}
          >
            {section.label}
          </div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline text-[11px] transition-all duration-200"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  background: isActive ? "var(--accent-dim)" : "transparent",
                  border: isActive ? "1px solid rgba(255,45,85,0.2)" : "1px solid transparent",
                }}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
