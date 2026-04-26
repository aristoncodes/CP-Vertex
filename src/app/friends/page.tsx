"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FriendButton } from "@/components/ui/FriendButton";
import { getLevelFromXP } from "@/lib/xp-math";

type Tab = "friends" | "requests" | "find";

interface Friend {
  id: string;
  name: string | null;
  cfHandle: string | null;
  cfRating: number | null;
  xp: number;
  level: number;
  streakCurrent: number;
  image: string | null;
  lastSeen: string | null;
  friendshipId: string;
}

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    name: string | null;
    cfHandle: string | null;
    cfRating: number | null;
    level: number;
    image: string | null;
  };
  createdAt: string;
}

interface SearchResult {
  id: string;
  name: string | null;
  cfHandle: string | null;
  cfRating: number | null;
  level: number;
  xp: number;
}

export default function FriendsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const fetchFriends = useCallback(async () => {
    setLoadingFriends(true);
    const res = await fetch("/api/friends");
    if (res.ok) setFriends(await res.json());
    setLoadingFriends(false);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    const res = await fetch("/api/friends/requests");
    if (res.ok) setRequests(await res.json());
    setLoadingRequests(false);
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch(`/api/user/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : (data.users || []));
      }
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAccept = async (friendshipId: string) => {
    await fetch("/api/friends/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "accept" }),
    });
    fetchRequests();
    fetchFriends();
  };

  const handleDecline = async (friendshipId: string) => {
    await fetch("/api/friends/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "decline" }),
    });
    fetchRequests();
  };

  const avatarStyle = (name: string | null, cfHandle: string | null): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, var(--primary), #60a5fa)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: 800, color: "white", flexShrink: 0,
  });

  const getInitial = (name: string | null, cfHandle: string | null) =>
    (cfHandle || name || "?").charAt(0).toUpperCase();

  const ratingColor = (r: number | null) => {
    if (!r) return "var(--text-muted)";
    if (r >= 2400) return "#FF0000";
    if (r >= 1900) return "#FF8C00";
    if (r >= 1600) return "#AA00AA";
    if (r >= 1400) return "#0000FF";
    if (r >= 1200) return "#008080";
    return "#808080";
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "unknown";
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "friends", label: "Friends", count: friends.length },
    { key: "requests", label: "Requests", count: requests.length || undefined },
    { key: "find", label: "Find Users" },
  ];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>Friends</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Connect with other competitive programmers</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom: tab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -2,
                color: tab === t.key ? "var(--primary)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "color 0.15s",
              }}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{
                  background: t.key === "requests" ? "var(--danger)" : "var(--surface-high)",
                  color: t.key === "requests" ? "white" : "var(--text-secondary)",
                  borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Friends Tab ─────────────────────────────── */}
        {tab === "friends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingFriends ? (
              <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading friends…</div>
            ) : friends.length === 0 ? (
              <div className="n-card" style={{ padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No friends yet</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                  Find users and add them as friends to see their activity here.
                </div>
                <button
                  onClick={() => setTab("find")}
                  style={{ padding: "8px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Find Users
                </button>
              </div>
            ) : friends.map(f => (
              <div key={f.id} className="n-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={avatarStyle(f.name, f.cfHandle)}>{getInitial(f.name, f.cfHandle)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{f.cfHandle || f.name}</div>
                  <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    <span style={{ color: ratingColor(f.cfRating), fontWeight: 700 }}>{f.cfRating || "Unrated"}</span>
                    <span>·</span>
                    <span>Lv {getLevelFromXP(f.xp)}</span>
                    <span>·</span>
                    <span>🔥 {f.streakCurrent}d streak</span>
                    <span>·</span>
                    <span>Active {timeAgo(f.lastSeen)}</span>
                  </div>
                </div>
                <div className="friend-card-actions" style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => router.push(`/profile/${f.cfHandle || f.id}`)}
                    style={{ padding: "6px 14px", background: "var(--surface-high)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => router.push(`/arena/matchmaking?challenge=${f.id}`)}
                    style={{ padding: "6px 14px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    ⚔️ Duel
                  </button>
                  <FriendButton userId={f.id} friendshipStatus="friends" onStatusChange={() => fetchFriends()} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Requests Tab ────────────────────────────── */}
        {tab === "requests" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingRequests ? (
              <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading requests…</div>
            ) : requests.length === 0 ? (
              <div className="n-card" style={{ padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No pending requests</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>When someone sends you a friend request, it will appear here.</div>
              </div>
            ) : requests.map(r => (
              <div key={r.id} className="n-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={avatarStyle(r.sender.name, r.sender.cfHandle)}>{getInitial(r.sender.name, r.sender.cfHandle)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.sender.cfHandle || r.sender.name}</div>
                  <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    <span style={{ color: ratingColor(r.sender.cfRating), fontWeight: 700 }}>{r.sender.cfRating || "Unrated"}</span>
                    <span>·</span>
                    <span>Lv {r.sender.level}</span>
                    <span>·</span>
                    <span>{timeAgo(r.createdAt)}</span>
                  </div>
                </div>
                <div className="friend-card-actions" style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleAccept(r.id)}
                    style={{ padding: "7px 16px", background: "var(--success)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => handleDecline(r.id)}
                    style={{ padding: "7px 16px", background: "var(--surface-card)", color: "var(--danger)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Find Users Tab ───────────────────────────── */}
        {tab === "find" && (
          <div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 20 }}>
                search
              </span>
              <input
                type="text"
                placeholder="Search by username or CF handle…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: "100%", padding: "11px 12px 11px 40px", boxSizing: "border-box",
                  background: "var(--surface-card)", border: "1px solid var(--border)",
                  borderRadius: 10, fontSize: 14, color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              {searchLoading && (
                <span className="material-symbols-outlined" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 18, animation: "spin 1s linear infinite" }}>
                  progress_activity
                </span>
              )}
            </div>

            {searchQuery.trim().length >= 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {searchResults.length === 0 && !searchLoading ? (
                  <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 32, fontSize: 13 }}>No users found for "{searchQuery}"</div>
                ) : searchResults.map(u => (
                  <div key={u.id} className="n-card" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={avatarStyle(u.name, u.cfHandle)}>{getInitial(u.name, u.cfHandle)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.cfHandle || u.name}</div>
                      <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        <span style={{ color: ratingColor(u.cfRating), fontWeight: 700 }}>{u.cfRating || "Unrated"}</span>
                        <span>·</span>
                        <span>Lv {getLevelFromXP(u.xp)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => router.push(`/profile/${u.cfHandle || u.id}`)}
                        style={{ padding: "6px 14px", background: "var(--surface-high)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}
                      >
                        Profile
                      </button>
                      <FriendButton userId={u.id} friendshipStatus="none" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim().length < 2 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12 }}>person_search</span>
                Type at least 2 characters to search for users
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
