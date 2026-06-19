"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PracticeRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/train"); }, [router]);
  return <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontFamily: "'Inter', sans-serif" }}>Redirecting to Train...</div>;
}
