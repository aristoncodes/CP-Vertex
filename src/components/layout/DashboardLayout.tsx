"use client";

import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { AppSidebar } from "./AppSidebar";
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
    <div style={{ background: "var(--surface)", minHeight: "100vh", display: "flex" }}>
      {/* Single left navigation rail (fixed on desktop, drawer on mobile) */}
      <AppSidebar />

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar />
        <LinkCFPrompt />

        <div
          className="layout-wrapper"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            width: "100%",
            display: "flex",
            gap: 28,
            position: "relative",
            flex: 1,
          }}
        >
          <main
            className="layout-main"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "28px 28px 80px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {children}
          </main>

          {rightPanel && (
            <aside
              className="layout-aside"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "28px 28px 80px 0",
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
    </div>
  );
}
