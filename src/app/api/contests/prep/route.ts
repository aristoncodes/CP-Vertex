import { auth } from "@/auth"
import { generateContestPrep } from "@/lib/intelligence"

// POST /api/contests/prep — Generate AI contest prep advice
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prep = await generateContestPrep(session.user.id)

    if (!prep) {
      return Response.json(
        { error: "Failed to generate contest prep. Make sure you have topic scores." },
        { status: 400 }
      )
    }

    return Response.json({ prep })
  } catch (error) {
    console.error("POST /api/contests/prep error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
