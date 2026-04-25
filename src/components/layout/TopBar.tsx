"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "space_dashboard" },
  { label: "Problems", href: "/problems", icon: "code" },
  { label: "Practice", href: "/practice", icon: "fitness_center" },
  { label: "Arena", href: "/arena", icon: "swords" },
  { label: "Contests", href: "/contests", icon: "emoji_events" },
  { label: "Leaderboard", href: "/leaderboard", icon: "leaderboard" },
  { label: "Intel", href: "/learn", icon: "menu_book" },
];

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
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const userHandle = session?.user?.cfHandle || session?.user?.name || "user";
  const displayHandle = session?.user?.name || "Guest";

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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
    }
    if (showNotifs) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifs]);

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

    // Navigate to duel if applicable
    if (notif.data?.duelId) {
      setShowNotifs(false);
      router.push(`/arena/duel/${notif.data.duelId}`);
    }
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Row 1: Logo + User */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--primary-hover), var(--primary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            CV
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            CP <span style={{ color: "var(--primary)" }}>Vertex</span>
          </span>
        </Link>

        {/* Right: Notifications + User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                          cursor: notif.data?.duelId ? "pointer" : "default",
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

          <Link
            href={`/profile/${userHandle}`}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--surface-high)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: "var(--text-muted)" }}
              >
                person
              </span>
            </div>
            {displayHandle}
          </Link>
          <Link
            href="/settings"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              transition: "background 0.15s",
            }}
            title="Settings"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              settings
            </span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--danger)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            title="Sign out"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              logout
            </span>
          </button>
        </div>
      </div>

      {/* Row 2: Nav tabs */}
      <nav
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface-card)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 4,
            overflowX: "auto",
          }}
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                  transition: "color 0.15s",
                  whiteSpace: "nowrap",
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
      </nav>
    </header>
  );
}
