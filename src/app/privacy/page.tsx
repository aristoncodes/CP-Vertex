import type { Metadata } from "next";
import { auth } from "@/auth";
import { PublicShell } from "@/components/layout/PublicShell";

export const metadata: Metadata = {
  title: "Privacy — CP-Vertex",
  description: "What CP-Vertex stores about you and why.",
};

export default async function PrivacyPage() {
  const session = await auth();
  return (
    <PublicShell isLoggedIn={!!session?.user}>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Privacy
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginTop: 12 }}>
          CP-Vertex is a training tool built on top of public Codeforces data. We try to store as
          little as possible and to be explicit about what we keep.
        </p>

        <Section title="What we read">
          The public Codeforces API: your profile (<code>user.info</code>), submissions
          (<code>user.status</code>), and rating history (<code>user.rating</code>). The public
          handle analyzer at <code>/u/&lt;handle&gt;</code> reads this live and stores nothing —
          it works without an account.
        </Section>

        <Section title="What we store (only if you sign in)">
          Your account email and OAuth identity; your linked Codeforces handle; and a copy of your
          submissions, which we use to compute XP, streaks, topic strength scores, and training
          recommendations. We never store your Codeforces password — handle ownership is verified
          by asking you to submit a Compilation Error to a random problem from your own account.
        </Section>

        <Section title="What we never do">
          We don&apos;t sell data, run third-party ad tracking, or post to Codeforces on your behalf.
          We cannot submit code or take any action on your Codeforces account.
        </Section>

        <Section title="Deleting your data">
          Settings → Danger Zone → Reset Account removes your stored submissions and progress. To
          delete your account entirely, contact the maintainer.
        </Section>
      </div>
    </PublicShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{children}</p>
    </div>
  );
}
