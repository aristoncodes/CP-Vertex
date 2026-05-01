"use client"
import { useAutoSync } from "@/hooks/useAutoSync"
import { useSession } from "next-auth/react"

export function AutoSyncProvider() {
  const { data: session } = useSession()
  // Only run auto-sync when the user has a CF handle connected
  if (session?.user?.cfHandle) {
    return <AutoSyncInner />
  }
  return null
}

function AutoSyncInner() {
  useAutoSync()
  return null
}
