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
      <div className="n-card" style={{ padding: "28px", display: "flex", alignItems: "center", gap: 24 }}>
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
        
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
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
