"use client";
import { useState } from "react";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

interface RivalEntry {
  handle: string; rating: number; maxRating: number; initials: string;
  wins: number; losses: number; total: number;
}
interface RatingEntry {
  contestId: number; contestName: string; rank: number; delta: number;
  date: string;
}

function RivalryRow({ rival, rank, onRemove }: { rival: RivalEntry; rank: number; onRemove: () => void }) {
  const wl = rival.wins > rival.losses ? "win" : rival.wins < rival.losses ? "lose" : "draw";
  const wlColor = wl === "win" ? "#3B6D11" : wl === "lose" ? "#A32D2D" : "#BA7517";
  const wlBg = wl === "win" ? "#EAF3DE" : wl === "lose" ? "#FCEBEB" : "#FAEEDA";
  const wlText = `${rival.wins}W – ${rival.losses}L`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-faint)", width: 20, textAlign: "center" }}>{rank}</span>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 500, color: "#fff", flexShrink: 0,
      }}>{rival.initials}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          <a href={`https://codeforces.com/profile/${rival.handle}`} target="_blank" rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-primary)")}
          >{rival.handle}</a>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rival.rating} (max {rival.maxRating})</div>
      </div>
      {rival.total > 0 && (
        <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: wlBg, color: wlColor }}>{wlText}</span>
      )}
      <button
        onClick={onRemove}
        title={`Remove ${rival.handle}`}
        style={{
          width: 24, height: 24, borderRadius: 6, border: "none",
          background: "transparent", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#FCEBEB")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#A32D2D" }}>close</span>
      </button>
    </div>
  );
}

function ContestRow({ entry }: { entry: RatingEntry }) {
  const isPositive = entry.delta >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text-faint)", width: 50 }}>{entry.date}</span>
      <div style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <a href={`https://codeforces.com/contest/${entry.contestId}`} target="_blank" rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-primary)")}
        >{entry.contestName.length > 30 ? entry.contestName.slice(0, 28) + "…" : entry.contestName}</a>
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
  rivalHandles: string[];
  addRival: (handle: string) => void;
  removeRival: (handle: string) => void;
}

export function RivalryBoard({ handle, rivals, ratingHistory, loading, rivalHandles, addRival, removeRival }: Props) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    // Support comma-separated
    const handles = inputValue.split(",").map(h => h.trim()).filter(Boolean);
    handles.forEach(h => addRival(h));
    setInputValue("");
  };

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
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>groups</span>
        Rivalry Board
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left — Friends Leaderboard */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center" }}>
            Rivals (last 90 days)
            <InfoTooltip info="Compare your rating and recent head-to-head performance against specific handles." align="left" />
          </div>

          {/* Add rival input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              className="n-input"
              placeholder="Add rival handle..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              style={{ fontSize: 12, padding: "8px 12px" }}
            />
            <button
              className="n-btn-primary"
              style={{ fontSize: 11, padding: "8px 14px", whiteSpace: "nowrap" }}
              onClick={handleAdd}
              disabled={!inputValue.trim()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_add</span>
              Add
            </button>
          </div>

          {/* Saved handles chips */}
          {rivalHandles.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {rivalHandles.map(h => (
                <span key={h} style={{
                  fontSize: 11, padding: "3px 10px 3px 8px", borderRadius: 16,
                  background: "var(--surface-low)", border: "0.5px solid var(--border)",
                  color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  {h}
                  <button
                    onClick={() => removeRival(h)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: "var(--text-faint)" }}>close</span>
                  </button>
                </span>
              ))}
            </div>
          )}

          {rivals.length === 0 && rivalHandles.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
              Add rival handles above to compare performance.
            </div>
          ) : rivals.length === 0 && rivalHandles.length > 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
              Loading rival data...
            </div>
          ) : (
            rivals.map((r, i) => <RivalryRow key={r.handle} rival={r} rank={i + 1} onRemove={() => removeRival(r.handle)} />)
          )}
        </div>

        {/* Right — Recent Rated Contests */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center" }}>
            Recent Rated Contests
            <InfoTooltip info="Your most recent rated contest performances, showing rank and rating change." align="right" />
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
