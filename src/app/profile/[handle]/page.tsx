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

/* ─── Badge definitions ─── */
const allBadges = [
  { id: "first_solve", slug: "first_solve", name: "First Blood", icon: "emoji_events", color: "#d97706", desc: "Solve your first problem" },
  { id: "streak_7", slug: "streak_7", name: "On Fire", icon: "local_fire_department", color: "#dc2626", desc: "7-day solve streak" },
  { id: "streak_30", slug: "streak_30", name: "Unstoppable", icon: "whatshot", color: "#f59e0b", desc: "30-day solve streak" },
  { id: "boss_slayer", slug: "boss_slayer", name: "Boss Slayer", icon: "swords", color: "#7c3aed", desc: "Defeat 10 boss problems" },
  { id: "blitz_master", slug: "blitz_master", name: "Speed Demon", icon: "bolt", color: "#0891b2", desc: "Complete 20 blitz sessions" },
  { id: "social", slug: "social", name: "Socialite", icon: "group", color: "#059669", desc: "Add 10 friends" },
  { id: "level_10", slug: "level_10", name: "Rising Star", icon: "star", color: "#0366d6", desc: "Reach Level 10" },
  { id: "level_25", slug: "level_25", name: "Elite", icon: "military_tech", color: "#FF8C00", desc: "Reach Level 25" },
  { id: "hundred_solves", slug: "hundred_solves", name: "Centurion", icon: "looks_one", color: "#14b8a6", desc: "Solve 100 problems" },
  { id: "duel_winner", slug: "duel_winner", name: "Gladiator", icon: "shield", color: "#6366f1", desc: "Win 5 duels" },
];

function getRankInfo(level: number): { name: string; color: string; bg: string } {
  if (level >= 40) return { name: "Grandmaster", color: "#dc2626", bg: "rgba(220,38,38,0.08)" };
  if (level >= 30) return { name: "Master", color: "#d97706", bg: "rgba(217,119,6,0.08)" };
  if (level >= 20) return { name: "Expert", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" };
  if (level >= 10) return { name: "Specialist", color: "#0891b2", bg: "rgba(8,145,178,0.08)" };
  if (level >= 5) return { name: "Apprentice", color: "#059669", bg: "rgba(5,150,105,0.08)" };
  return { name: "Novice", color: "var(--text-muted)", bg: "var(--surface-high)" };
}

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
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "100px 0", gap: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--text-faint)" }}>person_off</span>
          <div style={{ color: "var(--text-muted)", fontSize: 16, fontWeight: 600 }}>User not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  const rank = getRankInfo(profile.level || 1);
  const earned = profile.badges || [];
  const earnedSlugs = new Set(earned.map((b: any) => b.slug || b.id || b));
  const earnedCount = allBadges.filter(b => earnedSlugs.has(b.slug)).length;
  const isOwnProfile = session?.user?.id === profile.userId;

  return (
    <DashboardLayout>
      {/* ── Profile Header Card ── */}
      <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Gradient banner */}
        <div style={{
          height: 100,
          background: `linear-gradient(135deg, ${rank.color}30, var(--primary-light), ${rank.color}15)`,
          position: "relative",
        }} />

        {/* Avatar + Info */}
        <div style={{ padding: "0 28px 24px", marginTop: -36 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
            {/* Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: `linear-gradient(135deg, ${rank.color}, ${rank.color}90)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, fontWeight: 800, color: "white", flexShrink: 0,
              border: "4px solid var(--surface-card)",
              boxShadow: `0 4px 16px ${rank.color}25`,
            }}>
              {profile.name?.charAt(0).toUpperCase() || profile.cfHandle?.charAt(0).toUpperCase() || "?"}
            </div>

            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                  {profile.name || profile.cfHandle}
                </h1>
                <span style={{
                  padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: rank.bg, color: rank.color, letterSpacing: "0.02em",
                }}>{rank.name}</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                {profile.cfHandle && <span>@{profile.cfHandle}</span>}
                <span>·</span>
                <span>Level {profile.level || 1}</span>
                <span>·</span>
                <span>Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 4 }}>
              {profile.friendshipStatus !== undefined && !isOwnProfile && (
                <FriendButton userId={profile.userId} friendshipStatus={profile.friendshipStatus} />
              )}
              <StreakDisplay count={profile.streak || 0} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {[
          { label: "CF Rating", value: (profile.cfRating || 0).toLocaleString(), color: "var(--info)", icon: "trending_up" },
          { label: "Problems", value: (profile.totalSolved || 0).toString(), color: "var(--success)", icon: "check_circle" },
          { label: "Total XP", value: ((profile.xp || 0) / 1000).toFixed(1) + "K", color: "var(--warning)", icon: "star" },
          { label: "Badges", value: `${earnedCount}/${allBadges.length}`, color: "#d97706", icon: "military_tech" },
          { label: "Best Streak", value: (profile.streakLongest || 0).toString() + "d", color: "var(--danger)", icon: "local_fire_department" },
        ].map((stat) => (
          <div key={stat.label} className="n-card" style={{ padding: "16px 18px", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, marginTop: 8, letterSpacing: "-0.02em" }}>{stat.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Activity Heatmap (belongs on profile) ── */}
      <div style={{ position: "relative" }}>
        <Heatmap data={profile.heatmap || []} />
      </div>

      {/* ── Badge Showcase ── */}
      <div className="n-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="n-section-label" style={{ margin: 0 }}>Badge Showcase</div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{earnedCount} of {allBadges.length} earned</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {allBadges.map((badge) => {
            const isEarned = earnedSlugs.has(badge.slug);
            const earnedInfo = earned.find((b: any) => (b.slug || b.id || b) === badge.slug);
            return (
              <div key={badge.id} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "16px 8px", borderRadius: 12,
                background: isEarned ? `${badge.color}08` : "var(--surface-low)",
                border: `1px solid ${isEarned ? `${badge.color}30` : "var(--border)"}`,
                opacity: isEarned ? 1 : 0.35,
                transition: "all 0.2s",
                cursor: "default",
              }} title={badge.desc + (isEarned && earnedInfo?.earnedAt ? ` · Earned ${new Date(earnedInfo.earnedAt).toLocaleDateString()}` : "")}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 30,
                  color: isEarned ? badge.color : "var(--text-faint)",
                  fontVariationSettings: "'FILL' 1",
                  filter: isEarned ? `drop-shadow(0 0 10px ${badge.color}50)` : "none",
                }}>{badge.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: isEarned ? badge.color : "var(--text-faint)",
                  textAlign: "center",
                }}>{badge.name}</span>
                {isEarned && (
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                    {earnedInfo?.earnedAt ? new Date(earnedInfo.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "✓"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Rating History & Skill Radar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <RatingChart data={profile.ratingHistory || []} />
        <SkillChart topics={profile.topicScores || []} />
      </div>

      {/* ── Recent Activity Feed ── */}
      <div className="n-card" style={{ padding: "20px 24px" }}>
        <div className="n-section-label">Recent Activity</div>
        {(() => {
          // Build activity items from heatmap, badges, and level
          const activities: { icon: string; color: string; text: string; time: string }[] = [];

          // Recent solves from heatmap (last 7 days)
          const recentHeatmap = (profile.heatmap || [])
            .filter((h: any) => {
              const d = new Date(h.date);
              const now = new Date();
              return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
            })
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

          for (const h of recentHeatmap) {
            activities.push({
              icon: "check_circle",
              color: "var(--success)",
              text: `Solved ${h.count} problem${h.count > 1 ? "s" : ""}`,
              time: new Date(h.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            });
          }

          // Badge earning events
          for (const b of earned.slice(0, 3)) {
            activities.push({
              icon: "emoji_events",
              color: "#d97706",
              text: `Earned "${b.name || b.slug}" badge`,
              time: b.earnedAt ? new Date(b.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently",
            });
          }

          // Level milestone
          if (profile.level >= 5) {
            activities.push({
              icon: "arrow_upward",
              color: "var(--primary)",
              text: `Reached Level ${profile.level}`,
              time: "Milestone",
            });
          }

          if (activities.length === 0) {
            return (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", marginBottom: 8, color: "var(--text-faint)" }}>history</span>
                No recent activity. Start solving!
              </div>
            );
          }

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {activities.slice(0, 8).map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                  borderBottom: i < activities.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${a.color}12`, display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: a.color, fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{a.text}</div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{a.time}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── Topic Breakdown Table ── */}
      <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="n-section-label" style={{ margin: 0 }}>Topic Breakdown</div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{(profile.topicScores || []).length} topics tracked</span>
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
