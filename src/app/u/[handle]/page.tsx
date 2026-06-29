import type { Metadata } from "next";
import { auth } from "@/auth";
import { PublicShell } from "@/components/layout/PublicShell";
import { HandleAnalyzer } from "@/components/analysis/HandleAnalyzer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const title = `${handle} — Codeforces Analysis · CP-Vertex`;
  const description = `Topic strengths, rating history, contest strategy, and training recommendations for Codeforces handle ${handle}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicAnalyzerPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isOwnProfile =
    session?.user?.cfHandle?.toLowerCase() === handle?.toLowerCase();

  return (
    <PublicShell isLoggedIn={isLoggedIn}>
      <HandleAnalyzer handle={handle} isLoggedIn={isLoggedIn} isOwnProfile={!!isOwnProfile} />
    </PublicShell>
  );
}
