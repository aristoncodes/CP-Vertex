"use client"
import { useState } from "react"
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
  const [showToast, setShowToast] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  useAutoSync((imported) => {
    setImportedCount(imported)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 5000)
  })

  if (!showToast) return null

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      background: "#0C0D14",
      border: "1px solid #10B981",
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      zIndex: 9999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "slideInUp 0.3s ease-out"
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: "#001A10",
        color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync_saved_locally</span>
      </div>
      <div>
        <div style={{ color: "#F2F4FF", fontSize: 14, fontWeight: 700, fontFamily: "Arial" }}>Codeforces Synced</div>
        <div style={{ color: "#6B7280", fontSize: 12, fontFamily: "Courier New", marginTop: 2 }}>
          {importedCount > 0 ? `Successfully imported ${importedCount} new submission(s).` : "Your submissions are up to date."}
        </div>
      </div>
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
