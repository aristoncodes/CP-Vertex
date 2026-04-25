"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Scroll progress hook — replaces StringProgress.
 * Tracks scroll position through a section as 0→1 value.
 * Can also output as a CSS variable on the section element.
 */
export function useScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const total = el.scrollHeight - viewH;

      /* How far the top of the section has scrolled past the viewport top */
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / Math.max(total, 1)));
      setProgress(p);
      el.style.setProperty("--scroll-progress", String(p));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { ref, progress };
}
