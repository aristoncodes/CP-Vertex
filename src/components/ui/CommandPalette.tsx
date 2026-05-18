"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CmdItem {
  label: string;
  icon: string;
  href?: string;
  action?: () => void;
  shortcut?: string;
  section: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const items: CmdItem[] = [
    { label: "Dashboard", icon: "space_dashboard", href: "/dashboard", shortcut: "G D", section: "Navigate" },
    { label: "Train", icon: "fitness_center", href: "/train", shortcut: "G T", section: "Navigate" },
    { label: "Compete", icon: "swords", href: "/compete", shortcut: "G A", section: "Navigate" },
    { label: "Contests", icon: "emoji_events", href: "/contests", section: "Navigate" },
    { label: "Friends", icon: "group", href: "/friends", section: "Navigate" },
    { label: "Library", icon: "menu_book", href: "/learn", section: "Navigate" },
    { label: "My Profile", icon: "person", href: "/profile/me", section: "Navigate" },
    { label: "Start Boss Fight", icon: "local_fire_department", href: "/arena/boss", section: "Actions" },
    { label: "Start Blitz Mode", icon: "bolt", href: "/train/session?mode=blitz", section: "Actions" },
    { label: "Start Drill", icon: "target", href: "/train/session?mode=drill", section: "Actions" },
    { label: "Start Warmup", icon: "spa", href: "/train/session?mode=warmup", section: "Actions" },
    { label: "Find Opponent", icon: "person_search", href: "/compete/matchmaking", section: "Actions" },
  ];

  const filtered = query.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  // Group by section
  const sections: Record<string, CmdItem[]> = {};
  filtered.forEach((item) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  const flatFiltered = Object.values(sections).flat();

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setActiveIdx(0);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Reset active index on query change
  useEffect(() => { setActiveIdx(0); }, [query]);

  const execute = useCallback(
    (item: CmdItem) => {
      setOpen(false);
      setQuery("");
      if (item.href) router.push(item.href);
      if (item.action) item.action();
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % flatFiltered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + flatFiltered.length) % flatFiltered.length);
    } else if (e.key === "Enter" && flatFiltered[activeIdx]) {
      execute(flatFiltered[activeIdx]);
    }
  };

  if (!open) return null;

  let itemIndex = 0;

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 20px", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--text-muted)" }}>search</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ padding: "16px 0", borderBottom: "none" }}
          />
          <kbd style={{
            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: "var(--surface-high)", color: "var(--text-muted)", border: "1px solid var(--border)",
          }}>ESC</kbd>
        </div>
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <div className="cmd-results">
          {flatFiltered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              No results for &quot;{query}&quot;
            </div>
          ) : (
            Object.entries(sections).map(([section, sectionItems]) => (
              <div key={section}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", padding: "8px 14px 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {section}
                </div>
                {sectionItems.map((item) => {
                  const idx = itemIndex++;
                  return (
                    <div
                      key={item.label}
                      className={`cmd-item ${idx === activeIdx ? "active" : ""}`}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                        {item.icon}
                      </span>
                      {item.label}
                      {item.shortcut && <span className="cmd-shortcut">{item.shortcut}</span>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
