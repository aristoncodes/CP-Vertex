#!/usr/bin/env node
// CP-Algorithms Intel Import Script (Plain JS — no ts-node needed)
// Run: node scripts/import-algorithms.js

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Load .env
const envPath = path.join(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  }
}

const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// ─── Complete TOPIC_META — 143 articles ──────────────────────────────────────
const TOPIC_META = {
  // ── ALGEBRA (29)
  'algebra/binary-exp':                { category:'Algebra', subcategory:'Fundamentals',       difficulty:800,  tags:['math','algebra'] },
  'algebra/euclid-algorithm':          { category:'Algebra', subcategory:'Fundamentals',       difficulty:800,  tags:['math','gcd'] },
  'algebra/extended-euclid-algorithm': { category:'Algebra', subcategory:'Fundamentals',       difficulty:1200, tags:['math','gcd'] },
  'algebra/linear-diophantine-equation':{ category:'Algebra', subcategory:'Fundamentals',      difficulty:1400, tags:['math'] },
  'algebra/fibonacci-numbers':         { category:'Algebra', subcategory:'Fundamentals',       difficulty:1000, tags:['math'] },
  'algebra/sieve-of-eratosthenes':     { category:'Algebra', subcategory:'Prime Numbers',      difficulty:1000, tags:['math','primes'] },
  'algebra/prime-sieve-linear':        { category:'Algebra', subcategory:'Prime Numbers',      difficulty:1400, tags:['math','primes'] },
  'algebra/primality_tests':           { category:'Algebra', subcategory:'Prime Numbers',      difficulty:1600, tags:['math','primes'] },
  'algebra/factorization':             { category:'Algebra', subcategory:'Prime Numbers',      difficulty:1600, tags:['math','primes'] },
  'algebra/phi-function':              { category:'Algebra', subcategory:'Number Theory',      difficulty:1400, tags:['math','number-theory'] },
  'algebra/divisors':                  { category:'Algebra', subcategory:'Number Theory',      difficulty:1200, tags:['math','number-theory'] },
  'algebra/module-inverse':            { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:1200, tags:['math','modular'] },
  'algebra/linear_congruence_equation':{ category:'Algebra', subcategory:'Modular Arithmetic', difficulty:1600, tags:['math','modular'] },
  'algebra/chinese-remainder-theorem': { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:1700, tags:['math','modular'] },
  'algebra/garners-algorithm':         { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:1900, tags:['math','modular'] },
  'algebra/factorial-modulo':          { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:2000, tags:['math','modular'] },
  'algebra/discrete-log':              { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:2200, tags:['math','modular'] },
  'algebra/primitive-root':            { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:2000, tags:['math','modular'] },
  'algebra/discrete-root':             { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:2200, tags:['math','modular'] },
  'algebra/montgomery_multiplication': { category:'Algebra', subcategory:'Modular Arithmetic', difficulty:2400, tags:['math','modular'] },
  'algebra/balanced-ternary':          { category:'Algebra', subcategory:'Number Systems',     difficulty:1400, tags:['math'] },
  'algebra/gray-code':                 { category:'Algebra', subcategory:'Number Systems',     difficulty:1200, tags:['math','bitwise'] },
  'algebra/bit-manipulation':          { category:'Algebra', subcategory:'Miscellaneous',      difficulty:1000, tags:['bitwise'] },
  'algebra/all-submasks':              { category:'Algebra', subcategory:'Miscellaneous',      difficulty:1600, tags:['bitwise','dp'] },
  'algebra/big-integer':               { category:'Algebra', subcategory:'Miscellaneous',      difficulty:1800, tags:['math'] },
  'algebra/fft':                       { category:'Algebra', subcategory:'Miscellaneous',      difficulty:2500, tags:['math','fft'] },
  'algebra/polynomial':                { category:'Algebra', subcategory:'Miscellaneous',      difficulty:2600, tags:['math','fft'] },
  'algebra/continued-fractions':       { category:'Algebra', subcategory:'Miscellaneous',      difficulty:2100, tags:['math'] },
  'algebra/factoring-exp':             { category:'Algebra', subcategory:'Miscellaneous',      difficulty:2000, tags:['math'] },
  // ── DATA STRUCTURES (10)
  'data_structures/stack_queue_modification': { category:'Data Structures', subcategory:'Fundamentals', difficulty:1500, tags:['ds','stack','queue'] },
  'data_structures/sparse-table':      { category:'Data Structures', subcategory:'Fundamentals', difficulty:1700, tags:['ds','rmq'] },
  'data_structures/disjoint_set_union':{ category:'Data Structures', subcategory:'Trees',      difficulty:1600, tags:['ds','dsu'] },
  'data_structures/fenwick':           { category:'Data Structures', subcategory:'Trees',      difficulty:1700, tags:['ds','fenwick','bit'] },
  'data_structures/sqrt_decomposition':{ category:'Data Structures', subcategory:'Trees',      difficulty:2000, tags:['ds','sqrt'] },
  'data_structures/segment_tree':      { category:'Data Structures', subcategory:'Trees',      difficulty:1900, tags:['ds','segment-tree'] },
  'data_structures/treap':             { category:'Data Structures', subcategory:'Trees',      difficulty:2200, tags:['ds','bst'] },
  'data_structures/sqrt-tree':         { category:'Data Structures', subcategory:'Trees',      difficulty:2400, tags:['ds','sqrt'] },
  'data_structures/randomized_heap':   { category:'Data Structures', subcategory:'Trees',      difficulty:2100, tags:['ds','heap'] },
  'data_structures/deleting_in_log_n': { category:'Data Structures', subcategory:'Advanced',   difficulty:2600, tags:['ds'] },
  // ── DYNAMIC PROGRAMMING (7)
  'dynamic_programming/intro-to-dp':          { category:'Dynamic Programming', subcategory:'Fundamentals',  difficulty:1200, tags:['dp'] },
  'dynamic_programming/divide-and-conquer-dp':{ category:'Dynamic Programming', subcategory:'Optimizations', difficulty:2400, tags:['dp','divide-and-conquer'] },
  'dynamic_programming/dp-on-trees':          { category:'Dynamic Programming', subcategory:'Advanced',      difficulty:2000, tags:['dp','trees'] },
  'dynamic_programming/profile-dp':           { category:'Dynamic Programming', subcategory:'Advanced',      difficulty:2400, tags:['dp'] },
  'dynamic_programming/knuth-optimization':   { category:'Dynamic Programming', subcategory:'Optimizations', difficulty:2400, tags:['dp'] },
  'dynamic_programming/sos_dp':               { category:'Dynamic Programming', subcategory:'Optimizations', difficulty:2200, tags:['dp','bitwise'] },
  'dynamic_programming/convex_hull_trick':    { category:'Dynamic Programming', subcategory:'Optimizations', difficulty:2400, tags:['dp','geometry'] },
  // ── STRINGS (12)
  'string/string-hashing':             { category:'Strings', subcategory:'Fundamentals', difficulty:1600, tags:['strings','hashing'] },
  'string/rabin-karp':                 { category:'Strings', subcategory:'Fundamentals', difficulty:1700, tags:['strings','hashing'] },
  'string/prefix-function':            { category:'Strings', subcategory:'Fundamentals', difficulty:1900, tags:['strings','kmp'] },
  'string/z-function':                 { category:'Strings', subcategory:'Fundamentals', difficulty:1900, tags:['strings','z-function'] },
  'string/suffix-array':               { category:'Strings', subcategory:'Advanced',     difficulty:2400, tags:['strings','suffix-array'] },
  'string/suffix-automaton':           { category:'Strings', subcategory:'Advanced',     difficulty:2700, tags:['strings','automaton'] },
  'string/suffix-tree':                { category:'Strings', subcategory:'Advanced',     difficulty:2800, tags:['strings','suffix-tree'] },
  'string/aho_corasick':               { category:'Strings', subcategory:'Advanced',     difficulty:2300, tags:['strings','aho-corasick'] },
  'string/eertree':                    { category:'Strings', subcategory:'Advanced',     difficulty:2700, tags:['strings','palindromes'] },
  'string/lyndon_factorization':       { category:'Strings', subcategory:'Advanced',     difficulty:2400, tags:['strings'] },
  'string/manacher':                   { category:'Strings', subcategory:'Fundamentals', difficulty:2000, tags:['strings','palindromes'] },
  'string/expression_parsing':         { category:'Strings', subcategory:'Fundamentals', difficulty:1800, tags:['strings','parsing'] },
  // ── LINEAR ALGEBRA (4)
  'linear_algebra/linear-system-gauss':{ category:'Linear Algebra', subcategory:'Systems', difficulty:2000, tags:['math','linear-algebra'] },
  'linear_algebra/determinant-gauss':  { category:'Linear Algebra', subcategory:'Systems', difficulty:2000, tags:['math','linear-algebra'] },
  'linear_algebra/determinant-kraut':  { category:'Linear Algebra', subcategory:'Systems', difficulty:2100, tags:['math','linear-algebra'] },
  'linear_algebra/rank-matrix':        { category:'Linear Algebra', subcategory:'Systems', difficulty:2000, tags:['math','linear-algebra'] },
  // ── COMBINATORICS (9)
  'combinatorics/binomial-coefficients':   { category:'Combinatorics', subcategory:'Fundamentals', difficulty:1200, tags:['math','combinatorics'] },
  'combinatorics/catalan-numbers':         { category:'Combinatorics', subcategory:'Fundamentals', difficulty:1600, tags:['math','combinatorics'] },
  'combinatorics/inclusion-exclusion':     { category:'Combinatorics', subcategory:'Fundamentals', difficulty:1900, tags:['math','combinatorics'] },
  'combinatorics/burnside':                { category:'Combinatorics', subcategory:'Advanced',     difficulty:2500, tags:['math','combinatorics'] },
  'combinatorics/stars_and_bars':          { category:'Combinatorics', subcategory:'Fundamentals', difficulty:1400, tags:['math','combinatorics'] },
  'combinatorics/generating_combinations': { category:'Combinatorics', subcategory:'Enumeration',  difficulty:1300, tags:['math','combinatorics'] },
  'combinatorics/generating_permutations': { category:'Combinatorics', subcategory:'Enumeration',  difficulty:1200, tags:['math','combinatorics'] },
  'combinatorics/bishops-on-chessboard':   { category:'Combinatorics', subcategory:'Puzzles',      difficulty:1800, tags:['math','combinatorics'] },
  'combinatorics/dp-on-broken-profile':    { category:'Combinatorics', subcategory:'Advanced',     difficulty:2500, tags:['dp','combinatorics'] },
  // ── NUMERICAL METHODS (5)
  'num_methods/binary_search':             { category:'Numerical Methods', subcategory:'Search',   difficulty:1200, tags:['binary-search'] },
  'num_methods/ternary_search':            { category:'Numerical Methods', subcategory:'Search',   difficulty:1600, tags:['ternary-search'] },
  'num_methods/newton_method_for_iters':   { category:'Numerical Methods', subcategory:'Calculus', difficulty:1800, tags:['math'] },
  'num_methods/roots_newton':              { category:'Numerical Methods', subcategory:'Calculus',  difficulty:1700, tags:['math'] },
  'num_methods/integration':              { category:'Numerical Methods', subcategory:'Calculus',  difficulty:1900, tags:['math'] },
  // ── GEOMETRY (26)
  'geometry/basic-geometry':               { category:'Geometry', subcategory:'Fundamentals',  difficulty:1500, tags:['geometry'] },
  'geometry/polygon-area':                 { category:'Geometry', subcategory:'Fundamentals',  difficulty:1600, tags:['geometry'] },
  'geometry/oriented-triangle-area':       { category:'Geometry', subcategory:'Fundamentals',  difficulty:1500, tags:['geometry'] },
  'geometry/intersecting_segments':        { category:'Geometry', subcategory:'Intersections', difficulty:2100, tags:['geometry'] },
  'geometry/circle-line-intersection':     { category:'Geometry', subcategory:'Intersections', difficulty:1900, tags:['geometry'] },
  'geometry/circle-circle-intersection':   { category:'Geometry', subcategory:'Intersections', difficulty:2000, tags:['geometry'] },
  'geometry/common-tangents':              { category:'Geometry', subcategory:'Intersections', difficulty:2100, tags:['geometry'] },
  'geometry/length-of-segments-union':     { category:'Geometry', subcategory:'Intersections', difficulty:1900, tags:['geometry'] },
  'geometry/convex-hull':                  { category:'Geometry', subcategory:'Convex Hull',   difficulty:2000, tags:['geometry','convex-hull'] },
  'geometry/minkowski':                    { category:'Geometry', subcategory:'Convex Hull',   difficulty:2400, tags:['geometry','convex-hull'] },
  'geometry/point-in-convex-polygon':      { category:'Geometry', subcategory:'Convex Hull',   difficulty:2100, tags:['geometry','convex-hull'] },
  'geometry/nearest_points':               { category:'Geometry', subcategory:'Sweep Line',    difficulty:2000, tags:['geometry','sweep-line'] },
  'geometry/intersecting-segments-sweep':  { category:'Geometry', subcategory:'Sweep Line',    difficulty:2200, tags:['geometry','sweep-line'] },
  'geometry/vertical_decomposition':       { category:'Geometry', subcategory:'Sweep Line',    difficulty:2500, tags:['geometry','sweep-line'] },
  'geometry/halfplane-intersection':       { category:'Geometry', subcategory:'Sweep Line',    difficulty:2500, tags:['geometry'] },
  'geometry/delaunay':                     { category:'Geometry', subcategory:'Triangulation', difficulty:2700, tags:['geometry'] },
  'geometry/planar':                       { category:'Geometry', subcategory:'Triangulation', difficulty:2600, tags:['geometry'] },
  'geometry/circle-farthest-points':       { category:'Geometry', subcategory:'Fundamentals',  difficulty:1800, tags:['geometry'] },
  'geometry/lines-intersection':           { category:'Geometry', subcategory:'Intersections', difficulty:1700, tags:['geometry'] },
  'geometry/point-location':               { category:'Geometry', subcategory:'Sweep Line',    difficulty:2400, tags:['geometry'] },
  'geometry/segment-to-line':              { category:'Geometry', subcategory:'Fundamentals',  difficulty:1500, tags:['geometry'] },
  'geometry/rectangles_union':             { category:'Geometry', subcategory:'Sweep Line',    difficulty:2200, tags:['geometry'] },
  'geometry/picking-grid-points':          { category:'Geometry', subcategory:'Fundamentals',  difficulty:1700, tags:['geometry','math'] },
  'geometry/tangents-to-from-point':       { category:'Geometry', subcategory:'Intersections', difficulty:1900, tags:['geometry'] },
  'geometry/lattice-points':               { category:'Geometry', subcategory:'Fundamentals',  difficulty:1700, tags:['geometry','math'] },
  'geometry/rotation':                     { category:'Geometry', subcategory:'Fundamentals',  difficulty:1500, tags:['geometry'] },
  // ── GRAPHS (38)
  'graph/breadth-first-search':            { category:'Graphs', subcategory:'Traversal',      difficulty:1200, tags:['graphs','bfs'] },
  'graph/depth-first-search':              { category:'Graphs', subcategory:'Traversal',      difficulty:1200, tags:['graphs','dfs'] },
  'graph/dijkstra':                        { category:'Graphs', subcategory:'Shortest Paths', difficulty:1500, tags:['graphs','shortest-path','dijkstra'] },
  'graph/dijkstra_sparse':                 { category:'Graphs', subcategory:'Shortest Paths', difficulty:1600, tags:['graphs','shortest-path','dijkstra'] },
  'graph/bellman_ford':                    { category:'Graphs', subcategory:'Shortest Paths', difficulty:1600, tags:['graphs','shortest-path','bellman-ford'] },
  'graph/all-pair-shortest-path-floyd-warshall': { category:'Graphs', subcategory:'Shortest Paths', difficulty:1700, tags:['graphs','floyd-warshall'] },
  'graph/01_bfs':                          { category:'Graphs', subcategory:'Shortest Paths', difficulty:1700, tags:['graphs','bfs','shortest-path'] },
  'graph/d_shortest_path':                 { category:'Graphs', subcategory:'Shortest Paths', difficulty:2000, tags:['graphs','shortest-path'] },
  'graph/mst_kruskal':                     { category:'Graphs', subcategory:'Spanning Trees', difficulty:1600, tags:['graphs','mst','kruskal'] },
  'graph/mst_prim':                        { category:'Graphs', subcategory:'Spanning Trees', difficulty:1600, tags:['graphs','mst','prim'] },
  'graph/mst_kruskal_with_dsu':            { category:'Graphs', subcategory:'Spanning Trees', difficulty:1700, tags:['graphs','mst','dsu'] },
  'graph/second_best_mst':                 { category:'Graphs', subcategory:'Spanning Trees', difficulty:2200, tags:['graphs','mst'] },
  'graph/lca':                             { category:'Graphs', subcategory:'LCA',            difficulty:1900, tags:['graphs','trees','lca'] },
  'graph/lca_binary_lifting':              { category:'Graphs', subcategory:'LCA',            difficulty:2000, tags:['graphs','trees','lca'] },
  'graph/lca_farachcoltonbender':          { category:'Graphs', subcategory:'LCA',            difficulty:2600, tags:['graphs','trees','lca'] },
  'graph/heavy_path':                      { category:'Graphs', subcategory:'Trees',          difficulty:2400, tags:['graphs','trees','hld'] },
  'graph/centroid':                        { category:'Graphs', subcategory:'Trees',          difficulty:2200, tags:['graphs','trees','centroid'] },
  'graph/centroid-decomposition':          { category:'Graphs', subcategory:'Trees',          difficulty:2500, tags:['graphs','trees','centroid'] },
  'graph/dinic':                           { category:'Graphs', subcategory:'Flows',          difficulty:2300, tags:['graphs','flow','max-flow'] },
  'graph/push-relabel':                    { category:'Graphs', subcategory:'Flows',          difficulty:2500, tags:['graphs','flow','max-flow'] },
  'graph/min_cost_flow':                   { category:'Graphs', subcategory:'Flows',          difficulty:2400, tags:['graphs','flow','min-cost'] },
  'graph/kuhn_algorithm':                  { category:'Graphs', subcategory:'Matching',       difficulty:2000, tags:['graphs','bipartite','matching'] },
  'graph/hungarian-algorithm':             { category:'Graphs', subcategory:'Matching',       difficulty:2400, tags:['graphs','matching'] },
  'graph/2SAT':                            { category:'Graphs', subcategory:'Miscellaneous',  difficulty:2200, tags:['graphs','2sat','scc'] },
  'graph/strongly-connected-components':   { category:'Graphs', subcategory:'Miscellaneous',  difficulty:2000, tags:['graphs','scc'] },
  'graph/bridge-searching':                { category:'Graphs', subcategory:'Miscellaneous',  difficulty:1900, tags:['graphs','bridges'] },
  'graph/bridge-searching-online':         { category:'Graphs', subcategory:'Miscellaneous',  difficulty:2400, tags:['graphs','bridges'] },
  'graph/cutpoints':                       { category:'Graphs', subcategory:'Miscellaneous',  difficulty:1900, tags:['graphs','articulation'] },
  'graph/biconnected-components':          { category:'Graphs', subcategory:'Miscellaneous',  difficulty:2100, tags:['graphs','biconnected'] },
  'graph/euler_path':                      { category:'Graphs', subcategory:'Miscellaneous',  difficulty:1900, tags:['graphs','euler'] },
  'graph/topological-sort':                { category:'Graphs', subcategory:'Miscellaneous',  difficulty:1500, tags:['graphs','topo-sort','dag'] },
  'graph/finding-cycle':                   { category:'Graphs', subcategory:'Miscellaneous',  difficulty:1400, tags:['graphs','cycles'] },
  'graph/bipartite-check':                 { category:'Graphs', subcategory:'Miscellaneous',  difficulty:1400, tags:['graphs','bipartite'] },
  'graph/tree-painting':                   { category:'Graphs', subcategory:'Trees',          difficulty:2100, tags:['graphs','trees'] },
  'graph/kirchhoff-theorem':               { category:'Graphs', subcategory:'Miscellaneous',  difficulty:2400, tags:['graphs','math'] },
  'graph/pruefer_code':                    { category:'Graphs', subcategory:'Miscellaneous',  difficulty:2200, tags:['graphs','trees'] },
  'graph/link_cut_trees':                  { category:'Graphs', subcategory:'Trees',          difficulty:2800, tags:['graphs','trees','lct'] },
  'graph/dominator_tree':                  { category:'Graphs', subcategory:'Trees',          difficulty:2700, tags:['graphs','trees'] },
  // ── MISCELLANEOUS (13)
  'sequences/rmq':                              { category:'Miscellaneous', subcategory:'Sequences',      difficulty:1700, tags:['ds','rmq'] },
  'sequences/mex':                              { category:'Miscellaneous', subcategory:'Sequences',      difficulty:1600, tags:['math'] },
  'sequences/longest-increasing-subsequence':   { category:'Miscellaneous', subcategory:'Sequences',      difficulty:1900, tags:['dp','lis'] },
  'others/josephus_problem':                    { category:'Miscellaneous', subcategory:'Classic Problems',difficulty:1700, tags:['math'] },
  'others/15-puzzle':                           { category:'Miscellaneous', subcategory:'Classic Problems',difficulty:2000, tags:['bfs'] },
  'others/stern_brocot':                        { category:'Miscellaneous', subcategory:'Classic Problems',difficulty:2000, tags:['math'] },
  'others/tortoise_and_hare':                   { category:'Miscellaneous', subcategory:'Classic Problems',difficulty:1600, tags:['graphs'] },
  'game_theory/games_on_graphs':                { category:'Miscellaneous', subcategory:'Game Theory',    difficulty:2100, tags:['game-theory'] },
  'game_theory/nim':                            { category:'Miscellaneous', subcategory:'Game Theory',    difficulty:1900, tags:['game-theory'] },
  'game_theory/sprague-grundy-nim':             { category:'Miscellaneous', subcategory:'Game Theory',    difficulty:2200, tags:['game-theory'] },
  'schedules/schedule-one-machine':             { category:'Miscellaneous', subcategory:'Scheduling',     difficulty:1900, tags:['greedy'] },
  'schedules/schedule-two-machines':            { category:'Miscellaneous', subcategory:'Scheduling',     difficulty:2000, tags:['greedy'] },
  'schedules/optimal-schedule-k-machines':      { category:'Miscellaneous', subcategory:'Scheduling',     difficulty:2100, tags:['greedy'] },
}

// ─── Problem Parser ───────────────────────────────────────────────────────────
function parseProblems(content) {
  const problems = []
  const section = content.split(/##\s*Practice Problems/i)[1]
  if (!section) return problems
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let match
  while ((match = linkRegex.exec(section)) !== null) {
    const name = match[1].trim()
    const link = match[2].trim()
    let platform = 'Other'
    if (link.includes('codeforces.com'))   platform = 'Codeforces'
    else if (link.includes('spoj.com'))    platform = 'SPOJ'
    else if (link.includes('atcoder.jp'))  platform = 'AtCoder'
    else if (link.includes('acm.timus.ru'))platform = 'Timus'
    else if (link.includes('lightoj.com')) platform = 'LightOJ'
    const ratingMatch = name.match(/\b(800|900|1[0-9]{3}|2[0-9]{3}|3[0-9]{3})\b/)
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : null
    problems.push({ name, platform, link, rating })
  }
  return problems
}

// ─── DB Helpers (raw pg — no Prisma client needed) ───────────────────────────
async function upsertArticle(client, slug, title, meta, content) {
  // Upsert article
  const r = await client.query(
    `INSERT INTO "AlgorithmArticle" (id, slug, title, category, subcategory, content, difficulty, tags, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now(), now())
     ON CONFLICT (slug) DO UPDATE SET
       title=$2, category=$3, subcategory=$4, content=$5, difficulty=$6, tags=$7, "updatedAt"=now()
     RETURNING id`,
    [slug, title, meta.category, meta.subcategory, content, meta.difficulty, meta.tags]
  )
  return r.rows[0].id
}

async function upsertProblems(client, articleId, problems) {
  // Delete old problems for this article
  await client.query(`DELETE FROM "AlgorithmProblem" WHERE "articleId"=$1`, [articleId])
  // Insert new ones
  for (const p of problems) {
    await client.query(
      `INSERT INTO "AlgorithmProblem" (id, "articleId", name, platform, link, rating)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
      [articleId, p.name, p.platform, p.link, p.rating]
    )
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const repoPath = '/tmp/cp-algorithms-src'

  if (!fs.existsSync(repoPath)) {
    console.log('Cloning CP-Algorithms repository...')
    execSync(
      `git clone --depth=1 https://github.com/cp-algorithms/cp-algorithms ${repoPath}`,
      { stdio: 'inherit' }
    )
  } else {
    console.log('Pulling latest from CP-Algorithms...')
    try { execSync(`git -C ${repoPath} pull`, { stdio: 'inherit' }) } catch(e) {}
  }

  const srcPath = path.join(repoPath, 'src')
  const client = await pool.connect()
  let imported = 0, skipped = 0

  try {
    for (const [slug, meta] of Object.entries(TOPIC_META)) {
      const mdPath = path.join(srcPath, `${slug}.md`)
      if (!fs.existsSync(mdPath)) {
        console.log(`  SKIP  ${slug}`)
        skipped++
        continue
      }

      const rawContent = fs.readFileSync(mdPath, 'utf-8')
      const titleMatch = rawContent.match(/^#\s+(.+)$/m)
      const title = titleMatch
        ? titleMatch[1].replace(/¶/g, '').trim()
        : slug.split('/').pop()

      const problems = parseProblems(rawContent)
      const articleId = await upsertArticle(client, slug, title, meta, rawContent)
      await upsertProblems(client, articleId, problems)

      console.log(`  OK    ${slug}  (${problems.length} problems)`)
      imported++
    }
  } finally {
    client.release()
    await pool.end()
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`)
}

main().catch(err => { console.error(err); process.exit(1) })
