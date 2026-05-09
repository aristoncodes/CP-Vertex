"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SkillChart } from "@/components/ui/SkillChart";
import { RatingChart } from "@/components/ui/RatingChart";
import { Heatmap } from "@/components/ui/Heatmap";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { FriendButton } from "@/components/ui/FriendButton";
import { useSession } from "next-auth/react";

export default function ProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  const { data: session } = useSession();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/${handle}`)
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 0", color: "var(--text-muted)" }}>
          Loading profile...
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.error) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 0", color: "var(--text-muted)" }}>
          User not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Profile Header */}
      <div className="n-card profile-header" style={{ padding: "28px", display: "flex", alignItems: "center", gap: 24 }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg, var(--primary), #60a5fa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, color: "white", flexShrink: 0,
        }}>
          {profile.name?.charAt(0).toUpperCase() || profile.cfHandle?.charAt(0).toUpperCase() || "?"}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{profile.name || profile.cfHandle}</h1>
          <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            <span>@{profile.cfHandle || profile.name}</span><span>·</span>
            <span>Level {profile.level || 1}</span><span>·</span>
            <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="n-badge" style={{ background: "var(--warning-light)", color: "var(--warning)", padding: "6px 16px", fontSize: 13, fontWeight: 700 }}>
          {profile.level >= 40 ? "Gold I" : profile.level >= 20 ? "Silver I" : "Bronze I"}
        </div>
        
        <div className="profile-header-actions" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {profile.friendshipStatus !== undefined && session?.user?.id !== profile.userId && (
            <FriendButton
              userId={profile.userId}
              friendshipStatus={profile.friendshipStatus}
            />
          )}
          <StreakDisplay count={profile.streak || 0} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        {[
          { label: "CF Rating", value: (profile.cfRating || 0).toLocaleString(), color: "var(--info)", icon: "trending_up" },
          { label: "Problems", value: (profile.totalSolved || 0).toString(), color: "var(--success)", icon: "check_circle" },
          { label: "Total XP", value: ((profile.xp || 0) / 1000).toFixed(1) + "K", color: "var(--warning)", icon: "star" },
          { label: "Badges", value: (profile.badges?.length || 0).toString(), color: "#d97706", icon: "military_tech" },
          { label: "Level", value: (profile.level || 1).toString(), color: "var(--primary)", icon: "emoji_events" },
        ].map((stat) => (
          <div key={stat.label} className="n-card" style={{ padding: "16px 18px", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, marginTop: 8, letterSpacing: "-0.02em" }}>{stat.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Activity Heatmap */}
      <div style={{ position: "relative", marginTop: "16px", marginBottom: "16px" }}>
        <Heatmap data={profile.heatmap || []} />
      </div>

      {/* Badge Showcase (#14) */}
      <div className="n-card" style={{ padding: "20px 24px" }}>
        <div className="n-section-label">Badge Showcase</div>
        {(() => {
          const earned = profile.badges || [];
          const allBadges = [
            { id: "first_solve", name: "First Blood", icon: "emoji_events", color: "#d97706", desc: "Solve your first problem" },
            { id: "streak_7", name: "On Fire", icon: "local_fire_department", color: "#dc2626", desc: "7-day solve streak" },
            { id: "streak_30", name: "Unstoppable", icon: "whatshot", color: "#f59e0b", desc: "30-day solve streak" },
            { id: "boss_slayer", name: "Boss Slayer", icon: "swords", color: "#7c3aed", desc: "Defeat 10 boss problems" },
            { id: "blitz_master", name: "Speed Demon", icon: "bolt", color: "#0891b2", desc: "Complete 20 blitz sessions" },
            { id: "social", name: "Socialite", icon: "group", color: "#059669", desc: "Add 10 friends" },
            { id: "level_10", name: "Rising Star", icon: "star", color: "#0366d6", desc: "Reach Level 10" },
            { id: "level_25", name: "Elite", icon: "military_tech", color: "#FF8C00", desc: "Reach Level 25" },
            { id: "hundred_solves", name: "Centurion", icon: "looks_one", color: "#14b8a6", desc: "Solve 100 problems" },
            { id: "duel_winner", name: "Gladiator", icon: "shield", color: "#6366f1", desc: "Win 5 duels" },
          ];
          const earnedIds = new Set(earned.map((b: any) => b.id || b));

          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {allBadges.map((badge) => {
                const isEarned = earnedIds.has(badge.id);
                return (
                  <div key={badge.id} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "14px 8px", borderRadius: 12,
                    background: isEarned ? `${badge.color}08` : "var(--surface-low)",
                    border: `1px solid ${isEarned ? `${badge.color}30` : "var(--border)"}`,
                    opacity: isEarned ? 1 : 0.4,
                    transition: "all 0.2s",
                  }} title={badge.desc}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 28,
                      color: isEarned ? badge.color : "var(--text-faint)",
                      fontVariationSettings: "'FILL' 1",
                      filter: isEarned ? `drop-shadow(0 0 8px ${badge.color}40)` : "none",
                    }}>{badge.icon}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: isEarned ? badge.color : "var(--text-faint)",
                      textAlign: "center",
                    }}>{badge.name}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Rating & Skill Assessment */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <RatingChart data={profile.ratingHistory || []} />
        
        <SkillChart topics={profile.topicScores || []} />
      </div>

      {/* Topic Breakdown */}
      <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <div className="n-section-label" style={{ margin: 0 }}>Topic Breakdown</div>
        </div>
        <table className="n-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th style={{ width: 80, textAlign: "center" }}>Attempted</th>
              <th style={{ width: 80, textAlign: "center" }}>Solved</th>
              <th style={{ width: 80, textAlign: "center" }}>AC Rate</th>
              <th style={{ width: 80, textAlign: "center" }}>Score</th>
              <th style={{ width: 60 }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {(profile.topicScores || []).map((t: any) => {
              const acRate = t.attempted > 0 ? Math.round((t.solved / t.attempted) * 100) : 0;
              const trendIcon = t.trend === "up" ? "trending_up" : t.trend === "down" ? "trending_down" : "trending_flat";
              const trendColor = t.trend === "up" ? "var(--success)" : t.trend === "down" ? "var(--danger)" : "var(--text-muted)";
              return (
                <tr key={t.tag}>
                  <td style={{ fontWeight: 600, textTransform: "capitalize" }}>{t.tag}</td>
                  <td style={{ textAlign: "center" }}>{t.attempted}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "var(--success)" }}>{t.solved}</td>
                  <td style={{ textAlign: "center" }}>{acRate}%</td>
                  <td style={{ textAlign: "center" }}>{Math.round(t.score)}</td>
                  <td>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: trendColor }}>{trendIcon}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
