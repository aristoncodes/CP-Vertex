"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cp-vertex:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("cp-vertex:theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
        {dark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
