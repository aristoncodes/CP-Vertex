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

function getRankInfo(cfRating: number): { name: string; color: string; bg: string } {
  if (cfRating >= 2400) return { name: "Grandmaster", color: "#dc2626", bg: "rgba(220,38,38,0.08)" };
  if (cfRating >= 2100) return { name: "Master", color: "#FF8C00", bg: "rgba(255,140,0,0.08)" };
  if (cfRating >= 1900) return { name: "Candidate Master", color: "#a855f7", bg: "rgba(168,85,247,0.08)" };
  if (cfRating >= 1600) return { name: "Expert", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" };
  if (cfRating >= 1400) return { name: "Specialist", color: "#06b6d4", bg: "rgba(6,182,212,0.08)" };
  if (cfRating >= 1200) return { name: "Pupil", color: "#22c55e", bg: "rgba(34,197,94,0.08)" };
  if (cfRating > 0) return { name: "Newbie", color: "#6b7280", bg: "rgba(107,114,128,0.08)" };
  return { name: "Unrated", color: "var(--text-muted)", bg: "var(--surface-high)" };
}

export default function ProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  const { data: session } = useSession();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAllTopics, setShowAllTopics] = useState(false);

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

  const rank = getRankInfo(profile.cfRating || 0);
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
              overflow: "hidden",
            }}>
              {profile.image ? (
                <img src={profile.image} alt={profile.name || profile.cfHandle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                profile.name?.charAt(0).toUpperCase() || profile.cfHandle?.charAt(0).toUpperCase() || "?"
              )}
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
              <div key={badge.id} className="badge-card" style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "16px 8px", borderRadius: 12,
                background: isEarned ? `${badge.color}08` : "var(--surface-low)",
                border: `1px solid ${isEarned ? `${badge.color}30` : "var(--border)"}`,
                opacity: isEarned ? 1 : 0.35,
                transition: "all 0.25s",
                cursor: "default",
                position: "relative",
              }}>
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

                {/* Hover Tooltip */}
                <div className="badge-tooltip" style={{
                  position: "absolute", bottom: "calc(100% + 10px)", left: "50%",
                  transform: "translateX(-50%)", width: 200,
                  background: "var(--surface-card)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "12px 14px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  opacity: 0, pointerEvents: "none",
                  transition: "opacity 0.2s, transform 0.2s",
                  zIndex: 50,
                }}>
                  {/* Arrow */}
                  <div style={{
                    position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)",
                    width: 12, height: 12,
                    background: "var(--surface-card)", border: "1px solid var(--border)",
                    borderTop: "none", borderLeft: "none",
                  }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: isEarned ? badge.color : "var(--text-primary)", marginBottom: 4 }}>
                    {badge.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {badge.desc}
                  </div>
                  {isEarned && earnedInfo?.earnedAt && (
                    <div style={{ fontSize: 11, color: "var(--success)", marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Earned {new Date(earnedInfo.earnedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                  {!isEarned && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                      Not yet earned
                    </div>
                  )}
                </div>
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

      {/* ── Topic Breakdown (Visual) ── */}
      {(() => {
        const topics = (profile.topicScores || []).slice().sort((a: any, b: any) => b.score - a.score);
        const displayed = showAllTopics ? topics : topics.slice(0, 12);

        const getStrengthColor = (score: number) => {
          if (score >= 80) return "var(--success)";
          if (score >= 60) return "var(--info)";
          if (score >= 40) return "var(--warning)";
          return "var(--danger)";
        };

        const getStrengthLabel = (score: number) => {
          if (score >= 80) return "Strong";
          if (score >= 60) return "Good";
          if (score >= 40) return "Developing";
          return "Weak";
        };

        const getStrengthBg = (score: number) => {
          if (score >= 80) return "var(--success-light)";
          if (score >= 60) return "var(--info-light)";
          if (score >= 40) return "var(--warning-light)";
          return "var(--danger-light)";
        };

        return (
          <div className="n-card" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div className="n-section-label" style={{ margin: 0 }}>Topic Breakdown</div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{topics.length} topics tracked</span>
            </div>

            {/* Quick summary bar */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, padding: "12px 16px", background: "var(--surface-low)", borderRadius: 12 }}>
              {[
                { label: "Strong (80+)", count: topics.filter((t: any) => t.score >= 80).length, color: "var(--success)" },
                { label: "Good (60+)", count: topics.filter((t: any) => t.score >= 60 && t.score < 80).length, color: "var(--info)" },
                { label: "Developing", count: topics.filter((t: any) => t.score >= 40 && t.score < 60).length, color: "var(--warning)" },
                { label: "Weak (<40)", count: topics.filter((t: any) => t.score < 40).length, color: "var(--danger)" },
              ].map(g => (
                <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: g.color }} />
                  <span style={{ color: "var(--text-muted)" }}>{g.label}:</span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{g.count}</span>
                </div>
              ))}
            </div>

            {/* Topic cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {displayed.map((t: any) => {
                const acRate = t.attempted > 0 ? Math.round((t.solved / t.attempted) * 100) : 0;
                const scoreColor = getStrengthColor(t.score);
                const trendIcon = t.trend === "up" ? "trending_up" : t.trend === "down" ? "trending_down" : "trending_flat";
                const trendColor = t.trend === "up" ? "var(--success)" : t.trend === "down" ? "var(--danger)" : "var(--text-faint)";

                return (
                  <div key={t.tag} style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "var(--surface-low)",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s",
                  }}>
                    {/* Header: Topic name + trend */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, textTransform: "capitalize",
                        color: "var(--text-primary)", letterSpacing: "-0.01em",
                      }}>{t.tag}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: trendColor }}>{trendIcon}</span>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                      height: 6, borderRadius: 3,
                      background: "var(--surface-high)",
                      overflow: "hidden", marginBottom: 10,
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${Math.min(100, t.score)}%`,
                        background: scoreColor,
                        transition: "width 0.6s ease",
                      }} />
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-muted)" }}>
                        <span>{t.solved}<span style={{ opacity: 0.5 }}>/{t.attempted}</span></span>
                        <span>{acRate}% AC</span>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: scoreColor,
                        background: getStrengthBg(t.score),
                        padding: "2px 8px", borderRadius: 6,
                      }}>{Math.round(t.score)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more/less */}
            {topics.length > 12 && (
              <button
                onClick={() => setShowAllTopics(!showAllTopics)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", marginTop: 16, padding: "10px 0",
                  background: "none", border: "1px solid var(--border)",
                  borderRadius: 10, color: "var(--text-muted)", fontSize: 12,
                  fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {showAllTopics ? "expand_less" : "expand_more"}
                </span>
                {showAllTopics ? "Show Less" : `Show All ${topics.length} Topics`}
              </button>
            )}
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
