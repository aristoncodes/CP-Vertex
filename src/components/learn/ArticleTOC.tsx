"use client";

import { useEffect, useState } from "react";

export interface TocHeading {
  id: string;
  text: string;
  level: number; // 2 = h2, 3 = h3
}

/**
 * Sticky, scroll-spy table of contents for an article. Built server-side from
 * the article's `##`/`###` headings; highlights the section currently in view.
 */
export function ArticleTOC({ headings }: { headings: TocHeading[] }) {
  const [active, setActive] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // top offset clears the sticky header; bottom margin keeps the "active"
      // section the one near the top of the viewport, not the very bottom.
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
    history.replaceState(null, "", `#${id}`);
  };

  if (headings.length < 2) return null;

  return (
    <div
      style={{
        background: "var(--surface-card)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        padding: "20px 18px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-muted)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>list</span>
        On this page
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {headings.map((h) => {
          const isActive = active === h.id;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={(e) => go(e, h.id)}
              style={{
                display: "block",
                textDecoration: "none",
                fontSize: 13,
                lineHeight: 1.4,
                padding: "6px 10px",
                paddingLeft: h.level === 3 ? 22 : 10,
                borderLeft: `2px solid ${isActive ? "var(--primary)" : "transparent"}`,
                borderRadius: "0 6px 6px 0",
                background: isActive ? "var(--primary-light)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 450,
                transition: "color 0.15s, background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              {h.text}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
