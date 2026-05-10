import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { redis } from "./redis";

// ─── Gemini Client ────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─── Master System Prompt ─────────────────────────────
const SYSTEM_PROMPT = `You are an Elite Competitive Programming Coach (Legendary Grandmaster rank). Your tone is technical, encouraging, and focused on mathematical intuition. You guide students toward the "Aha!" moment — never spoon-feed answers.

Core Principles:
- Use LaTeX notation for all complexity expressions (e.g., $O(N \\log N)$, $O(\\sqrt{N})$).
- Be technically precise — reference specific data structures, algorithms, and their trade-offs.
- Keep responses scannable using Markdown formatting.
- Categorize errors as: Mathematical, Implementation, or Conceptual.
- When suggesting practice, reference specific algorithm families (e.g., "Monotone stack for histogram problems" not "practice more").
- Your style is direct and analytical — no filler, no generic advice. Every sentence must add value.`;

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const result = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] },
    ],
  });
  return result.response.text().trim();
}

async function callGeminiJSON<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
  try {
    const raw = await callGemini(systemPrompt, userPrompt);
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error("Gemini JSON parse error:", error);
    return null;
  }
}

// ─── Feature 1: AI Coach Insight (Daily Brief) ───────
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

  const userPrompt = `Current Task: AI Coach Insight (Daily Brief)

User Context:
- Codeforces Rating: ${user.cfRating || "Unrated"}
- Strongest Topics: ${topTags.join(", ")}
- Weakest Topics: ${weakTags.join(", ")}
- Total Topics Tracked: ${user.topicScores.length}

Your Mission:
1. Identify ONE specific weakness from the data above — be precise (e.g., "You are getting TLE'd on $O(N^2)$ DP transitions — you need to learn the Convex Hull Trick").
2. Provide one concrete "Tip of the Day" — a specific optimization trick, an STL technique, or a mathematical insight relevant to their weak area.
3. Command them to a specific training mode: ARENA MODE (target weak tags), BOSS FIGHT (push rating ceiling), or BLITZ MODE (speed training).

Format: 2-3 punchy sentences. No pleasantries. Every word must be tactically useful.`;

  try {
    const responseText = await callGemini(SYSTEM_PROMPT, userPrompt);
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
  errorCategory: string;
  rootCause: string;
  actionItem: string;
  nextProblemHint: string;
}

export async function analyzePostMortem(userId: string, postMortemId: string): Promise<PostMortemAnalysis | null> {
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
    return `- "${prob.title}" (Rating: ${prob.rating}, Tags: ${tags}) — Failures: [${pm.failureReasons.join(", ")}]${pm.howFixed ? ` — Student's Fix: "${pm.howFixed}"` : ""} — Perceived Difficulty: ${pm.difficultyFelt}/5`;
  };

  // Get user's rating for context
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cfRating: true } });

  const userPrompt = `Current Task: AI Post-Mortem Analysis

Student Rating: ${user?.cfRating || "Unrated"}

Previous Post-Mortems (recent first):
${history.length > 0 ? history.map(formatPM).join("\n") : "No previous data — this is their first post-mortem."}

CURRENT Failure Under Analysis:
${formatPM(current)}
Student's Confidence for Next Attempt: ${current.confidenceNext}

Your Mission:
1. Identify the exact "failure point" — was it a Logic Error, TLE due to $O(N^2)$ in a $10^5$ constraint, an Edge Case, or a Conceptual misunderstanding?
2. Categorize the error as: **Mathematical** (wrong formula/invariant), **Implementation** (correct idea, buggy code), or **Conceptual** (wrong approach entirely).
3. Look across their failure history — detect any recurring pattern (e.g., "3 out of 5 recent failures are TLE on graph problems").
4. Suggest ONE specific next problem or technique to fix this gap.

Respond with JSON only:
{
  "pattern": "1-2 sentence pattern detected across their failure history",
  "errorCategory": "Mathematical | Implementation | Conceptual",
  "rootCause": "the precise skill gap — be technical (e.g., 'Unable to recognize when $O(N \\\\log N)$ sorting + two-pointers replaces $O(N^2)$ brute force')",
  "actionItem": "one concrete behavioral change or technique to learn (e.g., 'Before coding, write the recurrence relation on paper. If it has overlapping subproblems, it is DP, not greedy.')",
  "nextProblemHint": "describe the type of problem they should solve next (e.g., 'Solve a Segment Tree problem with lazy propagation rated 1400-1600')"
}`;

  const analysis = await callGeminiJSON<PostMortemAnalysis>(SYSTEM_PROMPT, userPrompt);
  if (!analysis) return null;

  // Save to DB
  await prisma.postMortem.update({
    where: { id: postMortemId },
    data: { aiAnalysis: JSON.stringify(analysis) },
  });

  return analysis;
}

export interface ContestAnalysis {
  overallAssessment: string;
  timeManagement: string;
  criticalMistake: string;
  actionPlan: string;
}

export async function analyzeContest(userId: string, participationId: string): Promise<ContestAnalysis | null> {
  const participation = await prisma.contestParticipation.findUnique({
    where: { id: participationId },
    include: {
      upsolveItems: {
        include: { problem: true }
      }
    }
  });

  if (!participation || participation.userId !== userId) return null;

  const failedItems = participation.upsolveItems.map(item =>
    `- Problem: ${item.problem.title} (Rating: ${item.problem.rating}) - Status: ${item.lastVerdict || "Not attempted"} (${item.attemptCount} attempts)`
  ).join("\n");

  const userPrompt = `Student Contest Participation Record:
Contest: ${participation.contestName} (Div ${participation.division || "?"})
Rating Change: ${participation.ratingChange !== null ? (participation.ratingChange > 0 ? "+" : "") + participation.ratingChange : "Unrated"}
Problems Solved: ${participation.problemsSolved} / ${participation.totalProblems}

Failed/Upsolve Problems (What went wrong):
${failedItems || "No failed problems recorded."}

Your Mission:
Provide a brutally honest, highly technical post-mortem analysis of their entire contest performance.
Analyze their failure states based on the problems they couldn't solve or struggled with. Look at the problem ratings to estimate their current skill ceiling.

Respond with JSON only:
{
  "overallAssessment": "1-2 sentence high-level view of their performance (e.g., 'Solid start, but hit a wall at 1600-level Constructive Algorithms.')",
  "timeManagement": "Assess their strategy and attempt counts (e.g., 'Wasted 3 attempts on B instead of moving to C when stuck.')",
  "criticalMistake": "The biggest technical or strategic error they made during this contest.",
  "actionPlan": "A 2-step plan for upsolving these specific failures and improving for the next contest."
}`;

  const analysis = await callGeminiJSON<ContestAnalysis>(SYSTEM_PROMPT, userPrompt);
  if (!analysis) return null;

  await prisma.contestParticipation.update({
    where: { id: participationId },
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

  const userPrompt = `Current Task: AI Progressive Hints — Level ${requestedLevel} of 4

Problem: "${problem.title}"
Tags: [${tags}]
Rating: ${problem.rating}
Codeforces Link: ${problem.cfLink}

Hint Level Definitions:
- **Level 1 — The Hook**: A cryptic mathematical property or observation. What TYPE of problem is this? Give a high-level direction without naming the algorithm. Like a riddle that points to the right mental model. (1-2 sentences)
- **Level 2 — The Strategy**: Name the specific algorithm, data structure, or technique. Explain WHY it applies here by connecting it to the problem's constraints. (2-3 sentences)
- **Level 3 — The Logic**: Break down the transitions, the greedy choice, or the DP recurrence. Describe the step-by-step approach WITHOUT code. Include the key invariant or mathematical insight. (3-5 sentences)
- **Level 4 — The Implementation**: Pseudocode for the most complex part of the logic. Include complexity analysis with LaTeX notation. Mention edge cases to watch for.

Generate ONLY Level ${requestedLevel}. Do NOT leak information from higher levels.

Respond with JSON only:
{ "hint": "your hint text here — use markdown formatting and LaTeX where appropriate" }`;

  const result = await callGeminiJSON<HintResponse>(SYSTEM_PROMPT, userPrompt);
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
  trick: string;
  keyTakeaway: string;
  whenToUse: string;
  complexity: string;
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

  const userPrompt = `Current Task: AI Editorial Summary

Article: "${articleTitle}"
Source: CP-Algorithms

Content (first 3000 chars):
"""
${truncated}
"""

Condense this tutorial into a scannable study card. Respond with JSON:
{
  "trick": "The core idea in exactly 20 words or fewer — the one insight that makes this technique click",
  "keyTakeaway": "2-3 sentences explaining the concept with mathematical precision. Use LaTeX for any expressions.",
  "whenToUse": "Problem patterns where this technique applies. Be specific — e.g., 'When you need range minimum queries with point updates in $O(\\\\log N)$'",
  "complexity": "Time and space complexity with LaTeX, and WHY it fits typical competitive programming constraints (e.g., '$O(N \\\\log N)$ handles $N \\\\leq 10^5$ comfortably within 2s')",
  "commonMistakes": ["specific implementation pitfall 1", "specific pitfall 2", "specific pitfall 3"],
  "prerequisites": ["prerequisite topic 1", "prerequisite topic 2"],
  "difficulty": "beginner|intermediate|advanced"
}

Write for a student at ~1200 CF rating. Be concise but technically precise.`;

  const summary = await callGeminiJSON<EditorialSummary>(SYSTEM_PROMPT, userPrompt);
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

  const userPrompt = `Current Task: AI Roadmap Generation

Student Profile:
- CF Rating: ${userRating}
- Total Topics Tracked: ${user.topicScores.length}

Topic Scores (sorted weakest first):
${topicData}

Your Mission: Create a 4-week progressive training roadmap.

Roadmap Philosophy:
- Follow prerequisite ordering (e.g., teach BFS/DFS before shortest paths, basic DP before bitmask DP)
- Each week should build on the previous — create a narrative arc from "foundational gap" to "stretch goal"
- Suggest specific subtopics within each tag (e.g., for "dp": ["knapsack", "digit dp", "bitmask dp"])

Respond with JSON:
{
  "reasoning": "2-3 sentences explaining your coaching strategy — WHY this order, what the student gains by Week 4. Use mathematical precision.",
  "weeks": [
    {
      "focus": "exact tag name from the student's data above",
      "why": "1 sentence connecting this week to the overall strategy — make the student understand the purpose",
      "targetCount": 5_to_8,
      "minRating": min_problem_rating,
      "maxRating": max_problem_rating,
      "subtopics": ["specific subtopic 1", "specific subtopic 2"]
    }
  ]
}

Rules:
- Use EXACTLY the tag names from the student's data (case-insensitive match)
- Week 1 = most approachable weak topic, Week 4 = hardest stretch
- minRating = max(800, rating - 200), increasing ~100 per week
- Skip topics where the student already scores 80+
- Max 4 weeks`;

  const result = await callGeminiJSON<AIRoadmapResponse>(SYSTEM_PROMPT, userPrompt);
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
  const strong = user.topicScores.slice(0, 5).map((t) => `${t.tag.name} (${t.score}/100, ${t.trend})`).join(", ");
  const weak = [...user.topicScores].sort((a, b) => a.score - b.score).slice(0, 5)
    .map((t) => `${t.tag.name} (${t.score}/100, ${t.trend})`).join(", ");

  // Determine division
  let div = "Div 2";
  if (userRating >= 1900) div = "Div 1";
  else if (userRating >= 1600) div = "Div 1+2";

  const userPrompt = `Current Task: AI Contest Prep

Student Profile:
- CF Rating: ${userRating}
- Strongest Topics: ${strong}
- Weakest Topics: ${weak}

Contest Type: Codeforces ${div}
Typical ${div} Problem Distribution:
- A: 800-1000 (implementation/math, 5-10 min)
- B: 1000-1300 (greedy/constructive, 10-15 min)
- C: 1300-1600 (dp/graphs/binary search, 20-30 min)
- D: 1700-2100 (advanced techniques, 30-45 min)

Your Mission:
1. **Risk Areas**: Based on the student's weak topics, predict which problems (C/D) could trip them up. Be specific about the algorithm that might appear.
2. **Strengths**: What they can lean on — which problem types should be "free points."
3. **Warm-up Tags**: Suggest 2 topics to practice for 15 min before the contest, with appropriate ratings.
4. **Strategy**: 4-5 bullet points — specific to this student's rating. Include time management, when to skip, and how to approach debugging.
5. **Time Allocation**: How many minutes to spend on A, B, C, D.

Predict risk areas like: "This student's ${weak.split(",")[0]?.trim()} weakness means a C problem on this topic could cost them 30+ minutes."

Respond with JSON:
{
  "riskAreas": ["specific risk 1 with algorithm name", "specific risk 2"],
  "strengths": ["specific strength 1", "specific strength 2"],
  "warmupTags": [{"tag": "topic", "rating": number}, {"tag": "topic", "rating": number}],
  "strategy": ["strategy point 1", "strategy point 2", "strategy point 3", "strategy point 4"],
  "timeAllocation": {"A": "Xmin", "B": "Xmin", "C": "Xmin", "D": "Xmin"}
}

No generic advice. Every point must be tied to THIS student's data.`;

  return callGeminiJSON<ContestPrepResponse>(SYSTEM_PROMPT, userPrompt);
}
