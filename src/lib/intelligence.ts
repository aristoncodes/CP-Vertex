import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";

// Ensure the API key is set in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateCoachInsight(userId: string) {
  // 1. Fetch user stats
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      topicScores: {
        include: { tag: true },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!user || user.topicScores.length === 0) {
    return null;
  }

  // 2. Check rate limit (1 per day) using the DB
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingInsight = await prisma.coachInsight.findFirst({
    where: {
      userId,
      type: "gemini_tactical",
      createdAt: { gte: today },
    },
  });

  if (existingInsight) {
    return existingInsight;
  }

  // 3. Prepare prompt data
  const topTags = user.topicScores.slice(0, 3).map((t) => `${t.tag.name} (Score: ${t.score}, Trend: ${t.trend})`);
  const weakTags = [...user.topicScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((t) => `${t.tag.name} (Score: ${t.score}, Trend: ${t.trend})`);

  const prompt = `
You are an elite, uncompromising competitive programming coach. Your style is "Academic Brutalist"—harsh, direct, military-like, yet deeply analytical and ultimately helpful. 

Your student's current stats:
- Codeforces Rating: ${user.cfRating || "Unrated"}
- Strongest Topics: ${topTags.join(", ")}
- Weakest Topics: ${weakTags.join(", ")}

Generate a 2-sentence tactical recommendation for them.
In the first sentence, bluntly assess their current state based on their weak or declining topics.
In the second sentence, command them to play a specific mode (e.g., "ARENA MODE" to target weak tags, "BOSS FIGHT" to push rating limits, or "BLITZ MODE" for speed) and explicitly state what they must focus on.

Do not use pleasantries. Output only the 2-sentence recommendation.
`;

  try {
    // 4. Call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // 5. Save to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const insight = await prisma.coachInsight.create({
      data: {
        userId,
        type: "gemini_tactical",
        message: responseText,
        expiresAt,
      },
    });

    return insight;
  } catch (error) {
    console.error("Gemini Insight Generation Failed:", error);
    return null;
  }
}
