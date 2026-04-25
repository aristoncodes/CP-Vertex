"use client";

import { useCallback, useRef } from "react";

/**
 * Cursor tilt effect hook — replaces StringCursor behavior.
 * Returns onMouseMove and onMouseLeave handlers that apply perspective transforms.
 * Used on ProblemCard, ModeCard, and any tiltable element.
 */
export function useCursorTilt(maxDeg: number = 8) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      el.style.transform = `perspective(600px) rotateY(${dx * maxDeg}deg) rotateX(${-dy * maxDeg}deg) translateY(-2px)`;

      /* Also set cursor CSS vars for glow tracking */
      const rx = (e.clientX - rect.left) / rect.width;
      const ry = (e.clientY - rect.top) / rect.height;
      el.style.setProperty("--cursor-x", String(rx));
      el.style.setProperty("--cursor-y", String(ry));
    },
    [maxDeg]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.5s cubic-bezier(0.16,1,0.3,1)";
    el.style.transform = "";
    setTimeout(() => {
      if (el) el.style.transition = "";
    }, 500);
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
