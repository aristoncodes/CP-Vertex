/**
 * CP Vertex — Gym Problem Finder
 * Vercel Serverless Function (replaces Express server for deployment)
 * Streams progress via SSE
 */

// --- Utilities ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cfApiFetch(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);

    if (res.status === 503 || res.status === 429) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await sleep(delay);
        continue;
      }
      throw new Error(`Codeforces API returned ${res.status} after ${retries + 1} attempts. The service may be temporarily unavailable.`);
    }

    if (!res.ok) {
      throw new Error(`Codeforces API HTTP error: ${res.status}`);
    }

    const json = await res.json();

    if (json.status === 'FAILED') {
      throw new Error(json.comment || 'Codeforces API returned FAILED status');
    }

    return json.result;
  }
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// --- Serverless handler ---
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Health check
  if (pathname === '/api/health') {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  // Main endpoint: /api/find-problems
  if (pathname === '/api/find-problems') {
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const params = url.searchParams;
    const handlesStr = params.get('handles') || '';
    const minR = parseInt(params.get('minRating')) || 800;
    const maxR = parseInt(params.get('maxRating')) || 3500;
    const tagsStr = params.get('tags') || '';
    const maxProblems = parseInt(params.get('maxProblems')) || 0;

    const handles = handlesStr.split(',').map(h => h.trim()).filter(Boolean);
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

    if (handles.length === 0) {
      sendSSE(res, { stage: 'error', message: 'No handles provided.' });
      res.end();
      return;
    }

    try {
      // Stage 1: Validate handles & fetch submissions
      sendSSE(res, { stage: 'validating', message: 'Validating handles...' });

      const solvedSet = new Set();

      for (let i = 0; i < handles.length; i++) {
        const handle = handles[i];
        sendSSE(res, {
          stage: 'fetching',
          message: `Fetching submission histories (User ${i + 1} of ${handles.length})...`,
          current: i + 1,
          total: handles.length,
        });

        try {
          const submissions = await cfApiFetch(
            `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`
          );

          for (const sub of submissions) {
            if (sub.verdict === 'OK' && sub.problem) {
              const key = `${sub.problem.contestId}_${sub.problem.index}`;
              solvedSet.add(key);
            }
          }
        } catch (err) {
          const message = err.message.includes('not found') || err.message.includes('not exists')
            ? `User '${handle}' not found on Codeforces.`
            : err.message.includes('handle')
              ? `User '${handle}' not found on Codeforces.`
              : `Error fetching data for '${handle}': ${err.message}`;

          sendSSE(res, { stage: 'error', message });
          res.end();
          return;
        }

        if (i < handles.length - 1) {
          await sleep(1100);
        }
      }

      // Stage 2: Fetch problem set
      sendSSE(res, { stage: 'filtering', message: 'Intersecting data and filtering problem sets...' });
      await sleep(1100);

      const problemsetResult = await cfApiFetch(
        `https://codeforces.com/api/problemset.problems`
      );

      const allProblems = problemsetResult.problems || [];
      const tagSet = new Set(tags.map(t => t.toLowerCase()));

      // Stage 3: Filter
      const filtered = [];

      for (const p of allProblems) {
        if (p.rating === undefined || p.rating === null) continue;
        if (p.rating < minR || p.rating > maxR) continue;

        if (tagSet.size > 0) {
          const problemTags = (p.tags || []).map(t => t.toLowerCase());
          const hasMatchingTag = problemTags.some(t => tagSet.has(t));
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

      sendSSE(res, { stage: 'done', data: filtered });
      res.end();

    } catch (err) {
      sendSSE(res, {
        stage: 'error',
        message: `An unexpected error occurred: ${err.message}`,
      });
      res.end();
    }

    return;
  }

  // 404 for unknown API routes
  res.status(404).json({ error: 'Not found' });
}
