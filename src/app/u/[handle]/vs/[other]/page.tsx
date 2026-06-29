import type { Metadata } from "next";
import { auth } from "@/auth";
import { PublicShell } from "@/components/layout/PublicShell";
import { HandleCompare } from "@/components/analysis/HandleCompare";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; other: string }>;
}): Promise<Metadata> {
  const { handle, other } = await params;
  const title = `${handle} vs ${other} — Codeforces · CP-Vertex`;
  const description = `Head-to-head Codeforces comparison: rating, solve rate, and topic strengths for ${handle} and ${other}.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ handle: string; other: string }>;
}) {
  const { handle, other } = await params;
  const session = await auth();
  return (
    <PublicShell isLoggedIn={!!session?.user}>
      <HandleCompare a={handle} b={other} />
    </PublicShell>
  );
}
