/**
 * BullMQ Worker Entrypoint — Railway deployment
 *
 * Starts all 4 background workers:
 * - cf-sync: Fetches new CF submissions every 5 minutes
 * - strength-scores: Recomputes topic scores after AC
 * - coach-insights: Runs rule engine for insight generation
 * - weekly-digest: Monday 9am weekly review + email
 *
 * Deploy to Railway as a separate Node.js service.
 * Command: npx ts-node src/workers/index.ts
 */

import "./cf-sync"
import "./strength-scores"
import "./coach-insights"
import "./weekly-digest"

console.log("🚀 CodeArena workers started")
console.log("   ├── cf-sync")
console.log("   ├── strength-scores")
console.log("   ├── coach-insights")
console.log("   └── weekly-digest")

// Keep process alive
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down workers...")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down workers...")
  process.exit(0)
})
