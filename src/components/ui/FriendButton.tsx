"use client";

import { useState } from "react";

type FriendStatus = "none" | "pending_sent" | "pending_received" | "friends" | "self";

interface Props {
  userId: string;
  friendshipStatus: FriendStatus;
  onStatusChange?: (status: FriendStatus) => void;
}

export function FriendButton({ userId, friendshipStatus: initialStatus, onStatusChange }: Props) {
  const [status, setStatus] = useState<FriendStatus>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  if (status === "self" || !userId) return null;

  const update = (newStatus: FriendStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  const sendRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });
      if (res.ok || res.status === 409) update("pending_sent");
    } finally {
      setLoading(false);
    }
  };

  const unfriend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/friends/${userId}`, { method: "DELETE" });
      if (res.ok) update("none");
    } finally {
      setLoading(false);
      setShowDropdown(false);
    }
  };

  const cancelRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/friends/${userId}`, { method: "DELETE" });
      if (res.ok) update("none");
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (action: "accept" | "decline", friendshipId?: string) => {
    if (!friendshipId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/friends/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (res.ok) update(action === "accept" ? "friends" : "none");
    } finally {
      setLoading(false);
    }
  };

  const baseBtn: React.CSSProperties = {
    padding: "7px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: loading ? "not-allowed" : "pointer",
    border: "1px solid var(--border)",
    transition: "all 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    opacity: loading ? 0.7 : 1,
  };

  if (status === "none") {
    return (
      <button
        style={{ ...baseBtn, background: "var(--primary)", color: "white", borderColor: "var(--primary)" }}
        onClick={sendRequest}
        disabled={loading}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
        {loading ? "Sending…" : "Add Friend"}
      </button>
    );
  }

  if (status === "pending_sent") {
    return (
      <button
        style={{ ...baseBtn, background: "var(--surface-card)", color: "var(--text-muted)" }}
        onClick={cancelRequest}
        disabled={loading}
        title="Click to cancel request"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
        {loading ? "Cancelling…" : "Pending…"}
      </button>
    );
  }

  if (status === "pending_received") {
    // In this flow we need the friendshipId — simplified: re-fetch on mount
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <FriendRequestResponder userId={userId} onUpdate={update} />
      </div>
    );
  }

  if (status === "friends") {
    return (
      <div style={{ position: "relative" }}>
        <button
          style={{ ...baseBtn, background: "var(--success)", color: "white", borderColor: "var(--success)" }}
          onClick={() => setShowDropdown(v => !v)}
          disabled={loading}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Friends
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
        </button>
        {showDropdown && (
          <div style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "var(--surface-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 140,
            zIndex: 50,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            <button
              onClick={unfriend}
              disabled={loading}
              style={{
                width: "100%",
                padding: "8px 14px",
                background: "none",
                border: "none",
                color: "var(--danger)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_remove</span>
              {loading ? "Removing…" : "Unfriend"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Sub-component that fetches its own friendshipId to accept/decline
function FriendRequestResponder({ userId, onUpdate }: { userId: string; onUpdate: (s: FriendStatus) => void }) {
  const [loading, setLoading] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchId = async () => {
    if (fetched) return;
    setFetched(true);
    const res = await fetch("/api/friends/requests");
    if (res.ok) {
      const data = await res.json();
      const match = data.find((r: any) => r.sender.id === userId);
      if (match) setFriendshipId(match.id);
    }
  };

  const respond = async (action: "accept" | "decline") => {
    if (!friendshipId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/friends/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (res.ok) onUpdate(action === "accept" ? "friends" : "none");
    } finally {
      setLoading(false);
    }
  };

  // fetch ID on mount
  if (!fetched) fetchId();

  return (
    <>
      <button
        onClick={() => respond("accept")}
        disabled={loading || !friendshipId}
        style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: "var(--success)", color: "white", border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check</span>
        Accept
      </button>
      <button
        onClick={() => respond("decline")}
        disabled={loading || !friendshipId}
        style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: "var(--surface-card)", color: "var(--danger)", border: "1px solid var(--border)", cursor: "pointer",
        }}
      >
        Decline
      </button>
    </>
  );
}
