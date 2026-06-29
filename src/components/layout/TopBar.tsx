"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useUIStore } from "@/store/useUIStore";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: { duelId?: string } | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotifIcon(type: string) {
  switch (type) {
    case "duel_challenge": return "swords";
    case "duel_accepted": return "handshake";
    case "duel_declined": return "block";
    case "duel_result": return "emoji_events";
    default: return "notifications";
  }
}

function getNotifColor(type: string) {
  switch (type) {
    case "duel_challenge": return "var(--primary)";
    case "duel_accepted": return "var(--success)";
    case "duel_declined": return "var(--danger)";
    case "duel_result": return "var(--warning)";
    default: return "var(--text-muted)";
  }
}

export function TopBar() {
  const router = useRouter();
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const { data: session } = useSession();
  const userHandle = session?.user?.cfHandle || session?.user?.name || "user";
  const displayHandle = session?.user?.name || "Guest";

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // User menu state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* silent */ }
  }, []);

  // Poll notifications every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showNotifs || showUserMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifs, showUserMenu]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const handleNotifClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notif.id] }),
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* silent */ }
    }

    // Navigate based on notification type
    if (notif.data?.duelId) {
      setShowNotifs(false);
      router.push(`/compete/duel/${notif.data.duelId}`);
    } else if (notif.type.includes("friend")) {
      setShowNotifs(false);
      router.push("/friends");
    } else if (notif.type.includes("upsolve")) {
      setShowNotifs(false);
      router.push("/upsolve");
    } else {
      // For general notifications like badges or xp, we can just close the menu 
      // or optionally route to profile
      setShowNotifs(false);
    }
  };

  return (
    <header
      className="n-glass"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Row 1: hamburger (mobile) + actions */}
      <div
        className="topbar-row1"
        style={{
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Mobile hamburger — opens the left rail drawer */}
        <button
          className="sidebar-toggle"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)", background: "var(--surface-card)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu</span>
        </button>

        {/* Right: Notifications + User info — always pushed to the right
            (hamburger is hidden on desktop, so margin-left:auto keeps this
            cluster on the right edge instead of collapsing left). */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: showNotifs ? "var(--primary)" : "var(--text-muted)",
                background: showNotifs ? "var(--primary-light)" : "transparent",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative",
              }}
              title="Notifications"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: "var(--danger)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    boxShadow: "0 1px 4px rgba(220,38,38,0.4)",
                    animation: "pulse-dot 2s ease-in-out infinite",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifs && (
              <div
                className="notif-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 380,
                  maxHeight: 480,
                  overflowY: "auto",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
                  zIndex: 200,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                    Notifications
                    {unreadCount > 0 && (
                      <span style={{ color: "var(--primary)", marginLeft: 6, fontSize: 13, fontWeight: 600 }}>
                        ({unreadCount} new)
                      </span>
                    )}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--primary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: 6,
                        transition: "background 0.15s",
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                {notifications.length === 0 ? (
                  <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, display: "block", marginBottom: 8, opacity: 0.4 }}>
                      notifications_off
                    </span>
                    No notifications yet
                  </div>
                ) : (
                  <div>
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "14px 18px",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                          background: notif.isRead ? "transparent" : "rgba(3, 102, 214, 0.03)",
                          transition: "background 0.15s",
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${getNotifColor(notif.type)}12`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18, color: getNotifColor(notif.type), fontVariationSettings: "'FILL' 1" }}
                          >
                            {getNotifIcon(notif.type)}
                          </span>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: notif.isRead ? 500 : 700, color: "var(--text-primary)" }}>
                              {notif.title}
                            </span>
                            {!notif.isRead && (
                              <span style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: "var(--primary)", flexShrink: 0,
                              }} />
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                            {notif.message}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                            {timeAgo(notif.createdAt)}
                          </div>
                        </div>

                        {/* Action arrow for duel notifications */}
                        {notif.data?.duelId && (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 16, color: "var(--text-faint)", alignSelf: "center" }}
                          >
                            chevron_right
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ctrl+K shortcut hint */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 8,
              background: "var(--surface-high)", border: "1px solid var(--border)",
              color: "var(--text-muted)", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "border-color 0.15s",
            }}
            title="Command Palette (⌘K)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span>
            <span style={{ opacity: 0.7 }}>⌘K</span>
          </button>

          {/* User Menu Dropdown */}
          <div ref={userMenuRef} style={{ position: "relative", marginLeft: 4 }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: showUserMenu ? "var(--surface-high)" : "transparent",
                border: "1px solid",
                borderColor: showUserMenu ? "var(--border)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              title="User menu"
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)",
                  overflow: "hidden",
                }}
              >
                {session?.user?.image ? (
                  <img src={session.user.image} alt="User Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                    person
                  </span>
                )}
              </div>
            </button>

            {showUserMenu && (
              <div
                className="user-dropdown n-glass"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 260,
                  background: "var(--surface-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
                  zIndex: 200,
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {/* Header info */}
                <div style={{ padding: "12px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>
                    {displayHandle}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
                    @{userHandle}
                  </div>
                </div>

                {/* Menu items */}
                <Link
                  href={`/profile/${userHandle}`}
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8,
                    color: "var(--text-secondary)", fontSize: 14,
                    textDecoration: "none", transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "var(--surface-high)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
                  My Profile
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8,
                    color: "var(--text-secondary)", fontSize: 14,
                    textDecoration: "none", transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "var(--surface-high)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                  Settings
                </Link>

                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: 8,
                    color: "var(--text-secondary)", fontSize: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>palette</span>
                    Appearance
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ThemeToggle />
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }}></div>

                <button
                  onClick={() => { setShowUserMenu(false); signOut({ callbackUrl: "/login" }); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8,
                    color: "var(--danger)", fontSize: 14, fontWeight: 500,
                    background: "transparent", border: "none", cursor: "pointer",
                    textAlign: "left", transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </header>
  );
}
