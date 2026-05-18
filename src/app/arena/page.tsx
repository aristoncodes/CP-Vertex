"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ArenaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/compete"); }, [router]);
  return <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontFamily: "'Inter', sans-serif" }}>Redirecting to Compete...</div>;
}
