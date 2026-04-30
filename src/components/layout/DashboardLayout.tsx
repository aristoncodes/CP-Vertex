"use client";

import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { useEffect } from "react";
import { useAutoSync } from "@/hooks/useAutoSync";
import { LinkCFPrompt } from "@/components/ui/LinkCFPrompt";

export function DashboardLayout({
  children,
  rightPanel,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  // Auto-sync Codeforces submissions every 10 minutes in the background
  useAutoSync();

  // Heartbeat for online presence — sends every 60 seconds
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch("/api/user/heartbeat", { method: "POST" }).catch(() => {});
    };
    sendHeartbeat(); // send immediately on mount
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "var(--surface)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <LinkCFPrompt />

      {/* Centered content wrapper */}
      <div
        className="layout-wrapper"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          paddingTop: 108, // header height (logo row ~56px + nav row ~44px)
          display: "flex",
          gap: 32,
          position: "relative",
          flex: 1,
          width: "100%",
        }}
      >
        {/* Main content area */}
        <main
          className="layout-main"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "32px 32px 80px",
            display: "flex",
            flexDirection: "column" as const,
            gap: 24,
          }}
        >
          {children}
        </main>

        {/* Right panel */}
        {rightPanel && (
          <aside
            className="layout-aside"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              padding: "32px 32px 80px 0",
              width: 300,
              flexShrink: 0,
            }}
          >
            {rightPanel}
          </aside>
        )}
      </div>

      <Footer />
    </div>
  );
}
