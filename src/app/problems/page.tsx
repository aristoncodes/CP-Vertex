"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProblemsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/train?tab=problems"); }, [router]);
  return <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontFamily: "'Inter', sans-serif" }}>Redirecting to Train...</div>;
}
