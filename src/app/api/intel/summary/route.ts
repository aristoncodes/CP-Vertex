import { getEditorialSummary } from "@/lib/intelligence"

// POST /api/intel/summary — Get AI summary for an article
export async function POST(request: Request) {
  try {
    const { slug, title, content } = await request.json()

    if (!slug || !title || !content) {
      return Response.json(
        { error: "slug, title, and content are required" },
        { status: 400 }
      )
    }

    const summary = await getEditorialSummary(slug, title, content)

    if (!summary) {
      return Response.json(
        { error: "Failed to generate summary" },
        { status: 500 }
      )
    }

    return Response.json({ summary })
  } catch (error) {
    console.error("POST /api/intel/summary error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
