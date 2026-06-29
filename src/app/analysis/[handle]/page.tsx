"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { HandleAnalyzer } from "@/components/analysis/HandleAnalyzer";

export default function AnalysisPage() {
  const params = useParams();
  const handle = params.handle as string;
  const { data: session } = useSession();

  const userCfHandle = session?.user?.cfHandle;
  const isOwnProfile = userCfHandle?.toLowerCase() === handle?.toLowerCase();

  return (
    <DashboardLayout>
      <HandleAnalyzer handle={handle} isLoggedIn={!!session?.user} isOwnProfile={!!isOwnProfile} />
    </DashboardLayout>
  );
}
