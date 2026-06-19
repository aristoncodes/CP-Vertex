import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cfApiFetch(url: string, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 503 || res.status === 429) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await sleep(delay);
        continue;
      }
      throw new Error(
        `Codeforces API returned ${res.status} after ${retries + 1} attempts. The service may be temporarily unavailable.`
      );
    }
    if (!res.ok) {
      throw new Error(`Codeforces API HTTP error: ${res.status}`);
    }
    const json = await res.json();
    if (json.status === "FAILED") {
      throw new Error(json.comment || "Codeforces API returned FAILED status");
    }
    return json.result;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const handlesStr = searchParams.get("handles") || "";
  const minR = parseInt(searchParams.get("minRating") || "800", 10);
  const maxR = parseInt(searchParams.get("maxRating") || "3500", 10);
  const tagsStr = searchParams.get("tags") || "";
  const maxProblems = parseInt(searchParams.get("maxProblems") || "0", 10);

  const handles = handlesStr.split(",").map((h) => h.trim()).filter(Boolean);
  const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);

  const stream = new ReadableStream({
    async start(controller) {
      function sendSSE(data: any) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      if (handles.length === 0) {
        sendSSE({ stage: "error", message: "No handles provided." });
        controller.close();
        return;
      }

      try {
        // --- Stage 1: Validate handles & fetch submissions ---
        sendSSE({ stage: "validating", message: "Validating handles..." });

        const solvedSet = new Set<string>();

        for (let i = 0; i < handles.length; i++) {
          const handle = handles[i];
          sendSSE({
            stage: "fetching",
            message: `Fetching submission histories (User ${i + 1} of ${handles.length})...`,
            current: i + 1,
            total: handles.length,
          });

          try {
            const submissions = await cfApiFetch(
              `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`
            );

            for (const sub of submissions) {
              if (sub.verdict === "OK" && sub.problem) {
                const key = `${sub.problem.contestId}_${sub.problem.index}`;
                solvedSet.add(key);
              }
            }
          } catch (err: any) {
            const message =
              err.message.includes("not found") || err.message.includes("not exists")
                ? `User '${handle}' not found on Codeforces.`
                : err.message.includes("handle")
                ? `User '${handle}' not found on Codeforces.`
                : `Error fetching data for '${handle}': ${err.message}`;

            sendSSE({ stage: "error", message });
            controller.close();
            return;
          }

          if (i < handles.length - 1) {
            await sleep(1100);
          }
        }

        // --- Stage 2: Fetch problem set ---
        sendSSE({
          stage: "filtering",
          message: "Intersecting data and filtering problem sets...",
        });

        await sleep(1100);

        const problemsetResult = await cfApiFetch(
          `https://codeforces.com/api/problemset.problems`
        );

        const allProblems = problemsetResult.problems || [];
        const tagSet = new Set(tags.map((t) => t.toLowerCase()));

        // --- Stage 3: Filter ---
        const filtered = [];

        for (const p of allProblems) {
          if (p.rating === undefined || p.rating === null) continue;
          if (p.rating < minR || p.rating > maxR) continue;

          if (tagSet.size > 0) {
            const problemTags = (p.tags || []).map((t: string) => t.toLowerCase());
            const hasMatchingTag = problemTags.some((t: string) => tagSet.has(t));
            if (!hasMatchingTag) continue;
          }

          const key = `${p.contestId}_${p.index}`;
          if (solvedSet.has(key)) continue;

          filtered.push({
            contestId: p.contestId,
            index: p.index,
            code: `${p.contestId}${p.index}`,
            name: p.name,
            rating: p.rating,
            tags: p.tags || [],
          });

          if (maxProblems > 0 && filtered.length >= maxProblems) break;
        }

        // --- Done ---
        sendSSE({ stage: "done", data: filtered });
        controller.close();
      } catch (err: any) {
        sendSSE({
          stage: "error",
          message: `An unexpected error occurred: ${err.message}`,
        });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
