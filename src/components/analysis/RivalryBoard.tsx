"use client";
import { useState } from "react";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

interface RivalEntry {
  handle: string; rating: number; initials: string;
  wins: number; losses: number; total: number;
}
interface RatingEntry {
  contestId: number; contestName: string; rank: number; delta: number;
}

function RivalryRow({ rival, rank }: { rival: RivalEntry; rank: number }) {
  const wl = rival.wins > rival.losses ? "win" : rival.wins < rival.losses ? "lose" : "tied";
  const wlColor = wl === "win" ? "#3B6D11" : wl === "lose" ? "#A32D2D" : "#BA7517";
  const wlBg = wl === "win" ? "#EAF3DE" : wl === "lose" ? "#FCEBEB" : "#FAEEDA";
  const wlText = wl === "win" ? `you win ${rival.wins}/${rival.total}` : wl === "lose" ? `you lose ${rival.losses}/${rival.total}` : "tied";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-faint)", width: 20, textAlign: "center" }}>{rank}</span>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "linear-gradient(135deg, #5B4FD4, #7c6ff7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 500, color: "#fff", flexShrink: 0,
      }}>{rival.initials}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{rival.handle}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rival.rating || "Unrated"}</div>
      </div>
      {rival.total > 0 && (
        <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: wlBg, color: wlColor }}>{wlText}</span>
      )}
    </div>
  );
}

function ContestRow({ entry }: { entry: RatingEntry }) {
  const isPositive = entry.delta >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "monospace", width: 50 }}>#{entry.contestId}</span>
      <div style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {entry.contestName.length > 35 ? entry.contestName.slice(0, 33) + "…" : entry.contestName}
      </div>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>#{entry.rank}</span>
      <span style={{
        fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
        background: isPositive ? "#EAF3DE" : "#FCEBEB",
        color: isPositive ? "#3B6D11" : "#A32D2D",
      }}>
        {isPositive ? "+" : ""}{entry.delta}
      </span>
    </div>
  );
}

interface Props {
  handle: string;
  rivals: RivalEntry[];
  ratingHistory: RatingEntry[];
  loading: boolean;
  friendHandles: string;
  setFriendHandles: (v: string) => void;
}

export function RivalryBoard({ handle, rivals, ratingHistory, loading, friendHandles, setFriendHandles }: Props) {
  const [inputValue, setInputValue] = useState(friendHandles);

  if (loading) return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Rivalry Board</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="n-card" style={{ padding: "20px 24px" }}><Skeleton width="100%" height={160} /></div>
        <div className="n-card" style={{ padding: "20px 24px" }}><Skeleton width="100%" height={160} /></div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "#5B4FD4", fontVariationSettings: "'FILL' 1" }}>groups</span>
        Rivalry Board
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left — Friends Leaderboard */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Friends Leaderboard
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              className="n-input"
              placeholder="Enter handles (comma-separated)"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              style={{ fontSize: 12, padding: "8px 12px" }}
            />
            <button
              className="n-btn-primary"
              style={{ fontSize: 11, padding: "8px 14px", whiteSpace: "nowrap" }}
              onClick={() => setFriendHandles(inputValue)}
            >Compare</button>
          </div>
          {rivals.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
              Enter friend handles above to compare.
            </div>
          ) : (
            rivals.map((r, i) => <RivalryRow key={r.handle} rival={r} rank={i + 1} />)
          )}
        </div>

        {/* Right — Rating History */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Rating History
          </div>
          {ratingHistory.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No rated contests found.</div>
          ) : (
            ratingHistory.map(entry => <ContestRow key={entry.contestId} entry={entry} />)
          )}
        </div>
      </div>
    </div>
  );
}
