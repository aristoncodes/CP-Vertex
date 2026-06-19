/**
 * CP Vertex — Gym Problem Finder
 * Express backend server with SSE-based progress streaming
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- Utilities ---

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch JSON from the Codeforces API with retry logic
 * Retries up to 3 times on 503/429 with exponential backoff
 */
async function cfApiFetch(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);

    if (res.status === 503 || res.status === 429) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
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

// --- SSE Helper ---
function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// --- Main SSE endpoint ---
app.get('/api/find-problems', async (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const { handles: handlesStr, minRating, maxRating, tags: tagsStr, maxProblems: maxProblemsStr } = req.query;

  const handles = (handlesStr || '').split(',').map(h => h.trim()).filter(Boolean);
  const minR = parseInt(minRating) || 800;
  const maxR = parseInt(maxRating) || 3500;
  const tags = (tagsStr || '').split(',').map(t => t.trim()).filter(Boolean);
  const maxProblems = parseInt(maxProblemsStr) || 0;

  if (handles.length === 0) {
    sendSSE(res, { stage: 'error', message: 'No handles provided.' });
    res.end();
    return;
  }

  try {
    // --- Stage 1: Validate handles & fetch submissions ---
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

        // Extract solved problems
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

      // Rate limit: wait 1100ms between API calls
      if (i < handles.length - 1) {
        await sleep(1100);
      }
    }

    // --- Stage 2: Fetch problem set ---
    sendSSE(res, { stage: 'filtering', message: 'Intersecting data and filtering problem sets...' });

    // Wait before the next API call too
    await sleep(1100);

    // Fetch ALL problems (no tag filter in API) — we do OR-based tag filtering locally
    const problemsetResult = await cfApiFetch(
      `https://codeforces.com/api/problemset.problems`
    );

    const allProblems = problemsetResult.problems || [];

    // Build a Set of selected tags for fast lookup
    const tagSet = new Set(tags.map(t => t.toLowerCase()));

    // --- Stage 3: Filter ---
    const filtered = [];

    for (const p of allProblems) {
      // Skip problems without a rating
      if (p.rating === undefined || p.rating === null) continue;

      // Rating filter
      if (p.rating < minR || p.rating > maxR) continue;

      // Tag filter (OR logic): if tags were selected, problem must have at least one
      if (tagSet.size > 0) {
        const problemTags = (p.tags || []).map(t => t.toLowerCase());
        const hasMatchingTag = problemTags.some(t => tagSet.has(t));
        if (!hasMatchingTag) continue;
      }

      // Exclusion filter: skip if any user has solved it
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

      // Stop early if we've hit the max
      if (maxProblems > 0 && filtered.length >= maxProblems) break;
    }

    // --- Done ---
    sendSSE(res, { stage: 'done', data: filtered });
    res.end();

  } catch (err) {
    sendSSE(res, {
      stage: 'error',
      message: `An unexpected error occurred: ${err.message}`,
    });
    res.end();
  }
});

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✨ CP Vertex API server running on http://localhost:${PORT}`);
});
