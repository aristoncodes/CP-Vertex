import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { redis } from "./redis";

// ─── Gemini Client ────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function callGemini(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function callGeminiJSON<T>(prompt: string): Promise<T | null> {
  try {
    const raw = await callGemini(prompt);
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error("Gemini JSON parse error:", error);
    return null;
  }
}

// ─── Feature 1: AI Coach Insight (existing, cleaned up) ──
export async function generateCoachInsight(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      topicScores: {
        include: { tag: true },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!user || user.topicScores.length === 0) return null;

  // Rate limit: 1 per day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await prisma.coachInsight.findFirst({
    where: { userId, type: "gemini_tactical", createdAt: { gte: today } },
  });
  if (existing) return existing;

  const topTags = user.topicScores.slice(0, 3).map((t) => `${t.tag.name} (${t.score}/100, ${t.trend})`);
  const weakTags = [...user.topicScores].sort((a, b) => a.score - b.score).slice(0, 3)
    .map((t) => `${t.tag.name} (${t.score}/100, ${t.trend})`);

  const prompt = `You are an elite competitive programming coach. Style: harsh, direct, analytical.

Student stats:
- CF Rating: ${user.cfRating || "Unrated"}
- Strong: ${topTags.join(", ")}
- Weak: ${weakTags.join(", ")}

Generate a 2-sentence tactical recommendation.
Sentence 1: bluntly assess their weaknesses.
Sentence 2: command them to a specific mode (ARENA/BOSS FIGHT/BLITZ) with what to focus on.
No pleasantries. Output only the 2 sentences.`;

  try {
    const responseText = await callGemini(prompt);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    return await prisma.coachInsight.create({
      data: { userId, type: "gemini_tactical", message: responseText, expiresAt },
    });
  } catch (error) {
    console.error("Coach insight generation failed:", error);
    return null;
  }
}

// ─── Feature 2: AI Post-Mortem Analysis ───────────────
interface PostMortemAnalysis {
  pattern: string;
  rootCause: string;
  actionItem: string;
  encouragement: string;
}

export async function analyzePostMortem(userId: string, postMortemId: string): Promise<PostMortemAnalysis | null> {
  // Fetch the current post-mortem + submission + problem
  const current = await prisma.postMortem.findUnique({
    where: { id: postMortemId },
    include: {
      submission: {
        include: { problem: { include: { tags: { include: { tag: true } } } } },
      },
    },
  });
  if (!current) return null;

  // Fetch last 10 post-mortems for pattern detection
  const history = await prisma.postMortem.findMany({
    where: { userId, id: { not: postMortemId } },
    include: {
      submission: {
        include: { problem: { include: { tags: { include: { tag: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const formatPM = (pm: any) => {
    const prob = pm.submission.problem;
    const tags = prob.tags?.map((t: any) => t.tag.name).join(", ") || "unknown";
    return `- "${prob.title}" (${prob.rating}, ${tags}) — Failures: ${pm.failureReasons.join(", ")}${pm.howFixed ? ` — Fix: "${pm.howFixed}"` : ""} — Difficulty: ${pm.difficultyFelt}/5`;
  };

  const prompt = `You are analyzing a competitive programmer's failure patterns.

Previous post-mortems (recent first):
${history.length > 0 ? history.map(formatPM).join("\n") : "No previous data."}

CURRENT failure:
${formatPM(current)}
Confidence for next attempt: ${current.confidenceNext}

Respond with JSON only:
{
  "pattern": "1-2 sentence pattern across failures",
  "rootCause": "the fundamental skill gap causing this",
  "actionItem": "specific behavioral change to make (be concrete)",
  "encouragement": "1 sentence acknowledging progress or effort"
}`;

  const analysis = await callGeminiJSON<PostMortemAnalysis>(prompt);
  if (!analysis) return null;

  // Save to DB
  await prisma.postMortem.update({
    where: { id: postMortemId },
    data: { aiAnalysis: JSON.stringify(analysis) },
  });

  return analysis;
}

// ─── Feature 3: AI Progressive Hints ─────────────────
const HINT_XP_COSTS = [0, 10, 25, 50]; // Level 1=free, 2=10xp, 3=25xp, 4=50xp

interface HintResponse {
  hint: string;
}

export async function generateHint(
  userId: string,
  problemId: string,
  requestedLevel: number
): Promise<{ hint: string; xpCost: number; level: number } | { error: string }> {
  if (requestedLevel < 1 || requestedLevel > 4) {
    return { error: "Hint level must be between 1 and 4" };
  }

  // Check if this hint already exists
  const existing = await prisma.problemHint.findUnique({
    where: { userId_problemId_hintLevel: { userId, problemId, hintLevel: requestedLevel } },
  });
  if (existing) {
    return { hint: existing.hintText, xpCost: 0, level: requestedLevel };
  }

  // Ensure previous levels exist (must request sequentially)
  if (requestedLevel > 1) {
    const prevHint = await prisma.problemHint.findUnique({
      where: { userId_problemId_hintLevel: { userId, problemId, hintLevel: requestedLevel - 1 } },
    });
    if (!prevHint) {
      return { error: `You must request hint level ${requestedLevel - 1} first` };
    }
  }

  // Fetch problem details
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: { tags: { include: { tag: true } } },
  });
  if (!problem) return { error: "Problem not found" };

  // Check XP cost
  const xpCost = HINT_XP_COSTS[requestedLevel - 1];
  if (xpCost > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true, cfRating: true } });
    if (!user || user.xp < xpCost) {
      return { error: `Not enough XP. Need ${xpCost}, have ${user?.xp || 0}` };
    }
  }

  const tags = problem.tags.map((t) => t.tag.name).join(", ");

  const prompt = `You are giving a competitive programming hint.

Problem: "${problem.title}"
Tags: ${tags}
Rating: ${problem.rating}

Generate ONLY hint level ${requestedLevel} of 4:
- Level 1 (Conceptual): What TYPE of problem is this? One high-level direction sentence. Do NOT name the algorithm.
- Level 2 (Technique): Name the specific algorithm/data structure. 1-2 sentences.
- Level 3 (Approach): Step-by-step approach WITHOUT code. 3-4 sentences.
- Level 4 (Detailed): Full approach with pseudocode and complexity analysis.

Respond with JSON only:
{ "hint": "your hint text here" }

CRITICAL: Output ONLY level ${requestedLevel}. Do not leak information from higher levels.`;

  const result = await callGeminiJSON<HintResponse>(prompt);
  if (!result) return { error: "Failed to generate hint" };

  // Deduct XP if applicable
  if (xpCost > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { decrement: xpCost } },
    });
  }

  // Save hint
  await prisma.problemHint.create({
    data: {
      userId,
      problemId,
      hintLevel: requestedLevel,
      hintText: result.hint,
      xpCost,
    },
  });

  return { hint: result.hint, xpCost, level: requestedLevel };
}

// ─── Feature 4: AI Editorial Summaries ────────────────
interface EditorialSummary {
  keyTakeaway: string;
  whenToUse: string;
  commonMistakes: string[];
  prerequisites: string[];
  difficulty: string;
}

export async function getEditorialSummary(
  articleSlug: string,
  articleTitle: string,
  articleContent: string
): Promise<EditorialSummary | null> {
  // Check Redis cache (30-day TTL)
  const cacheKey = `editorial-summary:${articleSlug}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached as string); } catch { /* fall through */ }
  }

  // Truncate content to first 3000 chars for prompt efficiency
  const truncated = articleContent.substring(0, 3000);

  const prompt = `You are summarizing a competitive programming tutorial for students.

Article: "${articleTitle}"
Source: CP-Algorithms

Content (truncated):
"""
${truncated}
"""

Generate a JSON summary for a ~1200-rated student. Be concise and practical:
{
  "keyTakeaway": "2-3 sentences explaining the core concept simply",
  "whenToUse": "1-2 sentences on problem patterns where this applies",
  "commonMistakes": ["mistake 1", "mistake 2", "mistake 3"],
  "prerequisites": ["topic 1", "topic 2"],
  "difficulty": "beginner|intermediate|advanced"
}`;

  const summary = await callGeminiJSON<EditorialSummary>(prompt);
  if (!summary) return null;

  // Cache for 30 days
  await redis.setex(cacheKey, 30 * 24 * 3600, JSON.stringify(summary));
  return summary;
}

// ─── Feature 5: AI Roadmap Generation ─────────────────
interface AIRoadmapWeek {
  focus: string;
  why: string;
  targetCount: number;
  minRating: number;
  maxRating: number;
  subtopics: string[];
}

interface AIRoadmapResponse {
  reasoning: string;
  weeks: AIRoadmapWeek[];
}

export async function generateAIRoadmap(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      topicScores: { include: { tag: true }, orderBy: { score: "asc" } },
    },
  });
  if (!user || user.topicScores.length === 0) return null;

  const userRating = user.cfRating || 800;
  const topicData = user.topicScores.map((t) =>
    `${t.tag.name}: ${t.score}/100 (${t.trend}, ${t.acCount} solved)`
  ).join("\n");

  const prompt = `You are a competitive programming coach creating a 4-week training plan.

Student profile:
- CF Rating: ${userRating}
- Total topics tracked: ${user.topicScores.length}

Topic scores (sorted weakest first):
${topicData}

Create a 4-week plan targeting their weakest areas. Respond with JSON:
{
  "reasoning": "2-3 sentences explaining your strategy and why you chose this order",
  "weeks": [
    {
      "focus": "exact tag name from the list above",
      "why": "1 sentence why this week",
      "targetCount": number_of_problems (5-8),
      "minRating": min_problem_rating,
      "maxRating": max_problem_rating,
      "subtopics": ["specific subtopic 1", "specific subtopic 2"]
    }
  ]
}

Rules:
- Use EXACTLY the tag names from the student's data (lowercase, e.g., "dp", "graphs")
- Week 1 = most approachable weak topic, Week 4 = hardest stretch
- Difficulty range should be: minRating = max(800, rating-200), increasing each week
- Don't pick topics where the student already scores 80+
- Consider prerequisite order (basics before advanced techniques)`;

  const result = await callGeminiJSON<AIRoadmapResponse>(prompt);
  if (!result || !result.weeks || result.weeks.length === 0) return null;

  // Delete existing roadmap
  const existing = await prisma.roadmap.findUnique({ where: { userId } });
  if (existing) {
    await prisma.roadmapWeek.deleteMany({ where: { roadmapId: existing.id } });
    await prisma.roadmap.delete({ where: { id: existing.id } });
  }

  // Resolve tag names to IDs
  const weekData = [];
  for (let i = 0; i < result.weeks.length; i++) {
    const w = result.weeks[i];
    const tag = await prisma.tag.findFirst({
      where: { name: { equals: w.focus, mode: "insensitive" } },
    });
    if (!tag) continue;
    weekData.push({
      weekNumber: i + 1,
      tagId: tag.id,
      targetCount: w.targetCount,
      minRating: w.minRating,
      maxRating: w.maxRating,
      why: w.why,
      subtopics: w.subtopics || [],
    });
  }

  if (weekData.length === 0) return null;

  const roadmap = await prisma.roadmap.create({
    data: {
      userId,
      reasoning: result.reasoning,
      weeks: { create: weekData },
    },
    include: { weeks: true },
  });

  return { ...roadmap, aiReasoning: result.reasoning };
}

// ─── Feature 6: AI Contest Prep ───────────────────────
interface ContestPrepResponse {
  riskAreas: string[];
  strengths: string[];
  warmupTags: { tag: string; rating: number }[];
  strategy: string[];
  timeAllocation: Record<string, string>;
}

export async function generateContestPrep(userId: string): Promise<ContestPrepResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      topicScores: { include: { tag: true }, orderBy: { score: "desc" } },
    },
  });
  if (!user || user.topicScores.length === 0) return null;

  const userRating = user.cfRating || 800;
  const strong = user.topicScores.slice(0, 5).map((t) => `${t.tag.name} (${t.score})`).join(", ");
  const weak = [...user.topicScores].sort((a, b) => a.score - b.score).slice(0, 5)
    .map((t) => `${t.tag.name} (${t.score})`).join(", ");

  // Determine division
  let div = "Div 2";
  if (userRating >= 1900) div = "Div 1";
  else if (userRating >= 1600) div = "Div 1+2";

  const prompt = `You are a competitive programming contest coach.

Student: CF Rating ${userRating}
Strongest: ${strong}
Weakest: ${weak}

Upcoming contest type: Codeforces ${div}
Typical ${div}: A (800-1000), B (1000-1300), C (1300-1600), D (1700-2100)

Respond with JSON:
{
  "riskAreas": ["2-3 topics that could trip them on C/D problems"],
  "strengths": ["2-3 topics they can rely on"],
  "warmupTags": [
    {"tag": "topic to warm up", "rating": suggested_warmup_rating},
    {"tag": "topic to warm up", "rating": suggested_warmup_rating}
  ],
  "strategy": ["4-5 bullet point contest strategy tips, specific to their level"],
  "timeAllocation": {"A": "Xmin", "B": "Xmin", "C": "Xmin", "D": "Xmin"}
}

Be specific to their rating and weak topics. No generic advice.`;

  return callGeminiJSON<ContestPrepResponse>(prompt);
}
