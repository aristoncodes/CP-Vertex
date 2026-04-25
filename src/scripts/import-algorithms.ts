import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from "@prisma/adapter-pg"
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Using the project's specific adapter initialization
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Topic metadata map (slug → category/subcategory/difficulty/tags) ──────────
const TOPIC_META: Record<string, {
  category: string
  subcategory: string
  difficulty: number
  tags: string[]
}> = {
  "algebra/binary-exp":                  { category:"Algebra", subcategory:"Fundamentals",         difficulty:800,  tags:["math","algebra"] },
  "algebra/euclid-algorithm":            { category:"Algebra", subcategory:"Fundamentals",         difficulty:800,  tags:["math","gcd"] },
  "algebra/extended-euclid-algorithm":   { category:"Algebra", subcategory:"Fundamentals",         difficulty:1200, tags:["math","gcd"] },
  "algebra/linear-diophantine-equation": { category:"Algebra", subcategory:"Fundamentals",         difficulty:1400, tags:["math"] },
  "algebra/fibonacci-numbers":           { category:"Algebra", subcategory:"Fundamentals",         difficulty:1000, tags:["math"] },
  "algebra/sieve-of-eratosthenes":       { category:"Algebra", subcategory:"Prime Numbers",        difficulty:1000, tags:["math","primes"] },
  "algebra/prime-sieve-linear":          { category:"Algebra", subcategory:"Prime Numbers",        difficulty:1400, tags:["math","primes"] },
  "algebra/primality_tests":             { category:"Algebra", subcategory:"Prime Numbers",        difficulty:1600, tags:["math","primes"] },
  "algebra/factorization":               { category:"Algebra", subcategory:"Prime Numbers",        difficulty:1600, tags:["math","primes"] },
  "algebra/phi-function":                { category:"Algebra", subcategory:"Number Theory",        difficulty:1400, tags:["math","number-theory"] },
  "algebra/divisors":                    { category:"Algebra", subcategory:"Number Theory",        difficulty:1200, tags:["math","number-theory"] },
  "algebra/module-inverse":              { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:1200, tags:["math","modular"] },
  "algebra/linear_congruence_equation":  { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:1600, tags:["math","modular"] },
  "algebra/chinese-remainder-theorem":   { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:1700, tags:["math","modular"] },
  "algebra/garners-algorithm":           { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:1900, tags:["math","modular"] },
  "algebra/factorial-modulo":            { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:2000, tags:["math","modular"] },
  "algebra/discrete-log":                { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:2200, tags:["math","modular"] },
  "algebra/primitive-root":              { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:2000, tags:["math","modular"] },
  "algebra/discrete-root":               { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:2200, tags:["math","modular"] },
  "algebra/montgomery_multiplication":   { category:"Algebra", subcategory:"Modular Arithmetic",   difficulty:2400, tags:["math","modular"] },
  "algebra/balanced-ternary":            { category:"Algebra", subcategory:"Number Systems",       difficulty:1400, tags:["math"] },
  "algebra/gray-code":                   { category:"Algebra", subcategory:"Number Systems",       difficulty:1200, tags:["math","bitwise"] },
  "algebra/bit-manipulation":            { category:"Algebra", subcategory:"Miscellaneous",        difficulty:1000, tags:["bitwise"] },
  "algebra/all-submasks":                { category:"Algebra", subcategory:"Miscellaneous",        difficulty:1600, tags:["bitwise","dp"] },
  "algebra/big-integer":                 { category:"Algebra", subcategory:"Miscellaneous",        difficulty:1800, tags:["math"] },
  "algebra/fft":                         { category:"Algebra", subcategory:"Miscellaneous",        difficulty:2500, tags:["math","fft"] },
  "algebra/polynomial":                  { category:"Algebra", subcategory:"Miscellaneous",        difficulty:2600, tags:["math","fft"] },
  "algebra/continued-fractions":         { category:"Algebra", subcategory:"Miscellaneous",        difficulty:2100, tags:["math"] },
  "algebra/factoring-exp":               { category:"Algebra", subcategory:"Miscellaneous",        difficulty:2000, tags:["math"] },
  "algebra/factorial-divisors":          { category:"Combinatorics", subcategory:"Fundamentals",   difficulty:1600, tags:["math","combinatorics"] },

  "data_structures/stack_queue_modification": { category:"Data Structures", subcategory:"Fundamentals", difficulty:1500, tags:["ds","stack","queue"] },
  "data_structures/sparse-table":        { category:"Data Structures", subcategory:"Fundamentals", difficulty:1700, tags:["ds","rmq"] },
  "data_structures/disjoint_set_union":  { category:"Data Structures", subcategory:"Trees",        difficulty:1600, tags:["ds","dsu"] },
  "data_structures/fenwick":             { category:"Data Structures", subcategory:"Trees",        difficulty:1700, tags:["ds","fenwick","bit"] },
  "data_structures/sqrt_decomposition":  { category:"Data Structures", subcategory:"Trees",        difficulty:2000, tags:["ds","sqrt"] },
  "data_structures/segment_tree":        { category:"Data Structures", subcategory:"Trees",        difficulty:1900, tags:["ds","segment-tree"] },
  "data_structures/treap":               { category:"Data Structures", subcategory:"Trees",        difficulty:2200, tags:["ds","bst"] },
  "data_structures/sqrt-tree":           { category:"Data Structures", subcategory:"Trees",        difficulty:2400, tags:["ds","sqrt"] },
  "data_structures/randomized_heap":     { category:"Data Structures", subcategory:"Trees",        difficulty:2100, tags:["ds","heap"] },
  "data_structures/deleting_in_log_n":   { category:"Data Structures", subcategory:"Advanced",     difficulty:2600, tags:["ds"] },

  "dynamic_programming/intro-to-dp":     { category:"Dynamic Programming", subcategory:"Introduction",    difficulty:1300, tags:["dp"] },
  "dynamic_programming/knapsack":        { category:"Dynamic Programming", subcategory:"Introduction",    difficulty:1500, tags:["dp","knapsack"] },
  "dynamic_programming/longest_increasing_subsequence": { category:"Dynamic Programming", subcategory:"Introduction", difficulty:1700, tags:["dp","lis"] },
  "dynamic_programming/divide-and-conquer-dp": { category:"Dynamic Programming", subcategory:"DP Optimizations", difficulty:2400, tags:["dp","optimization"] },
  "dynamic_programming/knuth-optimization": { category:"Dynamic Programming", subcategory:"DP Optimizations", difficulty:2500, tags:["dp","optimization"] },
  "dynamic_programming/profile-dynamics":{ category:"Dynamic Programming", subcategory:"Classic Tasks",    difficulty:2200, tags:["dp","bitmask"] },
  "dynamic_programming/zero_matrix":     { category:"Dynamic Programming", subcategory:"Classic Tasks",    difficulty:1900, tags:["dp"] },

  "string/string-hashing":              { category:"Strings", subcategory:"Fundamentals",          difficulty:1500, tags:["strings","hashing"] },
  "string/rabin-karp":                  { category:"Strings", subcategory:"Fundamentals",          difficulty:1600, tags:["strings","hashing"] },
  "string/prefix-function":             { category:"Strings", subcategory:"Fundamentals",          difficulty:1900, tags:["strings","kmp"] },
  "string/z-function":                  { category:"Strings", subcategory:"Fundamentals",          difficulty:1900, tags:["strings","z-function"] },
  "string/suffix-array":                { category:"Strings", subcategory:"Fundamentals",          difficulty:2200, tags:["strings","suffix-array"] },
  "string/aho_corasick":                { category:"Strings", subcategory:"Fundamentals",          difficulty:2300, tags:["strings","automaton"] },
  "string/suffix-tree-ukkonen":         { category:"Strings", subcategory:"Advanced",              difficulty:2700, tags:["strings","suffix-tree"] },
  "string/suffix-automaton":            { category:"Strings", subcategory:"Advanced",              difficulty:2800, tags:["strings","automaton"] },
  "string/lyndon_factorization":        { category:"Strings", subcategory:"Advanced",              difficulty:2400, tags:["strings"] },
  "string/expression_parsing":          { category:"Strings", subcategory:"Tasks",                 difficulty:1800, tags:["strings","parsing"] },
  "string/manacher":                    { category:"Strings", subcategory:"Tasks",                 difficulty:2000, tags:["strings","palindrome"] },
  "string/main_lorentz":                { category:"Strings", subcategory:"Tasks",                 difficulty:2500, tags:["strings"] },

  "linear_algebra/linear-system-gauss": { category:"Linear Algebra", subcategory:"Matrices",       difficulty:2000, tags:["math","linear-algebra"] },
  "linear_algebra/determinant-gauss":   { category:"Linear Algebra", subcategory:"Matrices",       difficulty:2000, tags:["math","linear-algebra"] },
  "linear_algebra/determinant-kraut":   { category:"Linear Algebra", subcategory:"Matrices",       difficulty:2000, tags:["math","linear-algebra"] },
  "linear_algebra/rank-matrix":         { category:"Linear Algebra", subcategory:"Matrices",       difficulty:2100, tags:["math","linear-algebra"] },

  "combinatorics/binomial-coefficients":{ category:"Combinatorics", subcategory:"Fundamentals",    difficulty:1400, tags:["math","combinatorics"] },
  "combinatorics/catalan-numbers":      { category:"Combinatorics", subcategory:"Fundamentals",    difficulty:1600, tags:["math","combinatorics"] },
  "combinatorics/inclusion-exclusion":  { category:"Combinatorics", subcategory:"Techniques",      difficulty:1800, tags:["math","combinatorics"] },
  "combinatorics/burnside":             { category:"Combinatorics", subcategory:"Techniques",      difficulty:2200, tags:["math","combinatorics"] },
  "combinatorics/stars_and_bars":       { category:"Combinatorics", subcategory:"Techniques",      difficulty:1500, tags:["math","combinatorics"] },
  "combinatorics/generating_combinations": { category:"Combinatorics", subcategory:"Techniques",  difficulty:1400, tags:["math","combinatorics"] },
  "combinatorics/bishops-on-chessboard":{ category:"Combinatorics", subcategory:"Tasks",           difficulty:1700, tags:["math","combinatorics"] },
  "combinatorics/bracket_sequences":    { category:"Combinatorics", subcategory:"Tasks",           difficulty:1800, tags:["math","combinatorics","dp"] },
  "combinatorics/counting_labeled_graphs": { category:"Combinatorics", subcategory:"Tasks",        difficulty:2000, tags:["math","combinatorics"] },

  "num_methods/binary_search":          { category:"Numerical Methods", subcategory:"Search",      difficulty:1200, tags:["search","binary-search"] },
  "num_methods/ternary_search":         { category:"Numerical Methods", subcategory:"Search",      difficulty:1800, tags:["search","ternary-search"] },
  "num_methods/roots_newton":           { category:"Numerical Methods", subcategory:"Search",      difficulty:2000, tags:["math","search"] },
  "num_methods/simulated_annealing":    { category:"Numerical Methods", subcategory:"Search",      difficulty:2500, tags:["math","heuristic"] },
  "num_methods/simpson-integration":    { category:"Numerical Methods", subcategory:"Integration", difficulty:1900, tags:["math"] },

  "geometry/basic-geometry":            { category:"Geometry", subcategory:"Elementary",           difficulty:1200, tags:["geometry"] },
  "geometry/segment-to-line":           { category:"Geometry", subcategory:"Elementary",           difficulty:1400, tags:["geometry"] },
  "geometry/lines-intersection":        { category:"Geometry", subcategory:"Elementary",           difficulty:1500, tags:["geometry"] },
  "geometry/check-segments-intersection": { category:"Geometry", subcategory:"Elementary",         difficulty:1600, tags:["geometry"] },
  "geometry/segments-intersection":     { category:"Geometry", subcategory:"Elementary",           difficulty:1700, tags:["geometry"] },
  "geometry/circle-line-intersection":  { category:"Geometry", subcategory:"Elementary",           difficulty:1700, tags:["geometry"] },
  "geometry/circle-circle-intersection":{ category:"Geometry", subcategory:"Elementary",           difficulty:1800, tags:["geometry"] },
  "geometry/tangents-to-two-circles":   { category:"Geometry", subcategory:"Elementary",           difficulty:2000, tags:["geometry"] },
  "geometry/length-of-segments-union":  { category:"Geometry", subcategory:"Elementary",           difficulty:1800, tags:["geometry","sweep-line"] },
  "geometry/oriented-triangle-area":    { category:"Geometry", subcategory:"Polygons",             difficulty:1200, tags:["geometry"] },
  "geometry/area-of-simple-polygon":    { category:"Geometry", subcategory:"Polygons",             difficulty:1400, tags:["geometry"] },
  "geometry/point-in-convex-polygon":   { category:"Geometry", subcategory:"Polygons",             difficulty:1800, tags:["geometry","binary-search"] },
  "geometry/minkowski":                 { category:"Geometry", subcategory:"Polygons",             difficulty:2200, tags:["geometry","convex-hull"] },
  "geometry/picks-theorem":             { category:"Geometry", subcategory:"Polygons",             difficulty:1600, tags:["geometry","math"] },
  "geometry/lattice-points":            { category:"Geometry", subcategory:"Polygons",             difficulty:2000, tags:["geometry","math"] },
  "geometry/convex-hull":               { category:"Geometry", subcategory:"Convex Hull",          difficulty:1900, tags:["geometry","convex-hull"] },
  "geometry/convex_hull_trick":         { category:"Geometry", subcategory:"Convex Hull",          difficulty:2400, tags:["geometry","dp","convex-hull"] },
  "geometry/intersecting_segments":     { category:"Geometry", subcategory:"Sweep-line",           difficulty:2100, tags:["geometry","sweep-line"] },
  "geometry/planar":                    { category:"Geometry", subcategory:"Planar Graphs",         difficulty:2400, tags:["geometry","graphs"] },
  "geometry/point-location":            { category:"Geometry", subcategory:"Planar Graphs",         difficulty:2500, tags:["geometry"] },
  "geometry/nearest_points":            { category:"Geometry", subcategory:"Miscellaneous",        difficulty:1800, tags:["geometry","divide-conquer"] },
  "geometry/delaunay":                  { category:"Geometry", subcategory:"Miscellaneous",        difficulty:2700, tags:["geometry"] },
  "geometry/vertical_decomposition":    { category:"Geometry", subcategory:"Miscellaneous",        difficulty:2600, tags:["geometry"] },
  "geometry/halfplane-intersection":    { category:"Geometry", subcategory:"Miscellaneous",        difficulty:2600, tags:["geometry"] },
  "geometry/manhattan-distance":        { category:"Geometry", subcategory:"Miscellaneous",        difficulty:1600, tags:["geometry","math"] },
  "geometry/enclosing-circle":          { category:"Geometry", subcategory:"Miscellaneous",        difficulty:2100, tags:["geometry"] },

  "graph/breadth-first-search":         { category:"Graphs", subcategory:"Traversal",              difficulty:1200, tags:["graphs","bfs"] },
  "graph/depth-first-search":           { category:"Graphs", subcategory:"Traversal",              difficulty:1200, tags:["graphs","dfs"] },
  "graph/search-for-connected-components": { category:"Graphs", subcategory:"Components",          difficulty:1200, tags:["graphs","dfs","bfs"] },
  "graph/bridge-searching":             { category:"Graphs", subcategory:"Components",             difficulty:1900, tags:["graphs","bridges"] },
  "graph/bridge-searching-online":      { category:"Graphs", subcategory:"Components",             difficulty:2400, tags:["graphs","bridges"] },
  "graph/cutpoints":                    { category:"Graphs", subcategory:"Components",             difficulty:1900, tags:["graphs","articulation-points"] },
  "graph/strongly-connected-components":{ category:"Graphs", subcategory:"Components",             difficulty:1900, tags:["graphs","scc"] },
  "graph/strong-orientation":           { category:"Graphs", subcategory:"Components",             difficulty:2200, tags:["graphs","scc"] },
  "graph/dijkstra":                     { category:"Graphs", subcategory:"Shortest Paths",         difficulty:1500, tags:["graphs","shortest-path","dijkstra"] },
  "graph/dijkstra_sparse":              { category:"Graphs", subcategory:"Shortest Paths",         difficulty:1600, tags:["graphs","shortest-path","dijkstra"] },
  "graph/bellman_ford":                 { category:"Graphs", subcategory:"Shortest Paths",         difficulty:1600, tags:["graphs","shortest-path","bellman-ford"] },
  "graph/01_bfs":                       { category:"Graphs", subcategory:"Shortest Paths",         difficulty:1700, tags:["graphs","shortest-path","bfs"] },
  "graph/desopo_pape":                  { category:"Graphs", subcategory:"Shortest Paths",         difficulty:1700, tags:["graphs","shortest-path"] },
  "graph/all-pair-shortest-path-floyd-warshall": { category:"Graphs", subcategory:"Shortest Paths", difficulty:1700, tags:["graphs","floyd-warshall"] },
  "graph/fixed_length_paths":           { category:"Graphs", subcategory:"Shortest Paths",         difficulty:2200, tags:["graphs","matrix-exponentiation"] },
  "graph/mst_prim":                     { category:"Graphs", subcategory:"Spanning Trees",         difficulty:1600, tags:["graphs","mst","prim"] },
  "graph/mst_kruskal":                  { category:"Graphs", subcategory:"Spanning Trees",         difficulty:1600, tags:["graphs","mst","kruskal"] },
  "graph/mst_kruskal_with_dsu":         { category:"Graphs", subcategory:"Spanning Trees",         difficulty:1700, tags:["graphs","mst","dsu"] },
  "graph/second_best_mst":              { category:"Graphs", subcategory:"Spanning Trees",         difficulty:2200, tags:["graphs","mst","lca"] },
  "graph/kirchhoff-theorem":            { category:"Graphs", subcategory:"Spanning Trees",         difficulty:2400, tags:["graphs","math"] },
  "graph/pruefer_code":                 { category:"Graphs", subcategory:"Spanning Trees",         difficulty:2100, tags:["graphs","trees"] },
  "graph/finding-cycle":                { category:"Graphs", subcategory:"Cycles",                 difficulty:1400, tags:["graphs","dfs"] },
  "graph/finding-negative-cycle-in-graph": { category:"Graphs", subcategory:"Cycles",             difficulty:1700, tags:["graphs","bellman-ford"] },
  "graph/euler_path":                   { category:"Graphs", subcategory:"Cycles",                 difficulty:2000, tags:["graphs","euler"] },
  "graph/lca":                          { category:"Graphs", subcategory:"LCA",                    difficulty:1900, tags:["graphs","trees","lca"] },
  "graph/lca_binary_lifting":           { category:"Graphs", subcategory:"LCA",                    difficulty:2000, tags:["graphs","trees","lca"] },
  "graph/lca_farachcoltonbender":       { category:"Graphs", subcategory:"LCA",                    difficulty:2500, tags:["graphs","trees","lca"] },
  "graph/rmq_linear":                   { category:"Graphs", subcategory:"LCA",                    difficulty:2300, tags:["graphs","trees","rmq"] },
  "graph/lca_tarjan":                   { category:"Graphs", subcategory:"LCA",                    difficulty:2200, tags:["graphs","trees","lca"] },
  "graph/edmonds_karp":                 { category:"Graphs", subcategory:"Flows",                  difficulty:2100, tags:["graphs","flow","max-flow"] },
  "graph/push-relabel":                 { category:"Graphs", subcategory:"Flows",                  difficulty:2400, tags:["graphs","flow","max-flow"] },
  "graph/push-relabel-faster":          { category:"Graphs", subcategory:"Flows",                  difficulty:2500, tags:["graphs","flow","max-flow"] },
  "graph/dinic":                        { category:"Graphs", subcategory:"Flows",                  difficulty:2300, tags:["graphs","flow","max-flow"] },
  "graph/mpm":                          { category:"Graphs", subcategory:"Flows",                  difficulty:2500, tags:["graphs","flow","max-flow"] },
  "graph/flow_with_demands":            { category:"Graphs", subcategory:"Flows",                  difficulty:2400, tags:["graphs","flow"] },
  "graph/min_cost_flow":                { category:"Graphs", subcategory:"Flows",                  difficulty:2400, tags:["graphs","flow","min-cost"] },
  "graph/Assignment-problem-min-flow":  { category:"Graphs", subcategory:"Flows",                  difficulty:2300, tags:["graphs","flow","matching"] },
  "graph/bipartite-check":              { category:"Graphs", subcategory:"Matchings",              difficulty:1500, tags:["graphs","bipartite"] },
  "graph/kuhn_maximum_bipartite_matching": { category:"Graphs", subcategory:"Matchings",           difficulty:2100, tags:["graphs","matching","bipartite"] },
  "graph/hungarian-algorithm":          { category:"Graphs", subcategory:"Matchings",              difficulty:2400, tags:["graphs","matching"] },
  "graph/topological-sort":             { category:"Graphs", subcategory:"Miscellaneous",          difficulty:1600, tags:["graphs","topological-sort"] },
  "graph/edge_vertex_connectivity":     { category:"Graphs", subcategory:"Miscellaneous",          difficulty:2200, tags:["graphs","connectivity"] },
  "graph/tree_painting":                { category:"Graphs", subcategory:"Miscellaneous",          difficulty:2100, tags:["graphs","trees"] },
  "graph/2SAT":                         { category:"Graphs", subcategory:"Miscellaneous",          difficulty:2200, tags:["graphs","2sat","scc"] },
  "graph/hld":                          { category:"Graphs", subcategory:"Miscellaneous",          difficulty:2400, tags:["graphs","trees","hld"] },
  "graph/centroid_decomposition":       { category:"Graphs", subcategory:"Miscellaneous",          difficulty:2500, tags:["graphs","trees","centroid"] },

  "sequences/rmq":                      { category:"Miscellaneous", subcategory:"Sequences",       difficulty:1700, tags:["ds","rmq"] },
  "others/maximum_average_segment":     { category:"Miscellaneous", subcategory:"Sequences",       difficulty:1400, tags:["ds"] },
  "sequences/k-th":                     { category:"Miscellaneous", subcategory:"Sequences",       difficulty:2000, tags:["ds","order-statistics"] },
  "sequences/mex":                      { category:"Miscellaneous", subcategory:"Sequences",       difficulty:1600, tags:["ds"] },
  "game_theory/games_on_graphs":        { category:"Miscellaneous", subcategory:"Game Theory",     difficulty:2100, tags:["game-theory"] },
  "game_theory/sprague-grundy-nim":     { category:"Miscellaneous", subcategory:"Game Theory",     difficulty:2200, tags:["game-theory","nim"] },
  "schedules/schedule_one_machine":     { category:"Miscellaneous", subcategory:"Schedules",       difficulty:2000, tags:["greedy","scheduling"] },
  "schedules/schedule_two_machines":    { category:"Miscellaneous", subcategory:"Schedules",       difficulty:2200, tags:["greedy","scheduling"] },
  "schedules/schedule-with-completion-duration": { category:"Miscellaneous", subcategory:"Schedules", difficulty:2100, tags:["greedy","scheduling"] },
  "others/tortoise_and_hare":           { category:"Miscellaneous", subcategory:"Classic",         difficulty:1600, tags:["ds","cycle-detection"] },
  "others/josephus_problem":            { category:"Miscellaneous", subcategory:"Classic",         difficulty:1800, tags:["math"] },
  "others/15-puzzle":                   { category:"Miscellaneous", subcategory:"Classic",         difficulty:2200, tags:["math","graphs"] },
  "others/stern_brocot_tree_farey_sequences": { category:"Miscellaneous", subcategory:"Classic",   difficulty:2300, tags:["math"] },
}

// ── Parse practice problems from markdown ─────────────────────────────────────
function parseProblems(content: string): Array<{name:string, platform:string, link:string, rating:number|null}> {
  const problems: Array<{name:string, platform:string, link:string, rating:number|null}> = []
  const problemSection = content.split(/##\s*Practice Problems/i)[1]
  if (!problemSection) return problems

  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g
  let match
  while ((match = linkRegex.exec(problemSection)) !== null) {
    const name = match[1].trim()
    const link = match[2].trim()
    
    let platform = "Other"
    if (link.includes("codeforces.com")) platform = "Codeforces"
    else if (link.includes("spoj.com")) platform = "SPOJ"
    else if (link.includes("e-olymp.com")) platform = "E-Olymp"
    else if (link.includes("acm.timus.ru")) platform = "Timus"
    else if (link.includes("lightoj.com")) platform = "LightOJ"
    else if (link.includes("atcoder.jp")) platform = "AtCoder"

    // Try extract CF rating from problem name if present
    const ratingMatch = name.match(/\b(800|900|1[0-9]{3}|2[0-9]{3}|3[0-9]{3})\b/)
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : null

    problems.push({ name, platform, link, rating })
  }
  return problems
}

// ── Main import function ───────────────────────────────────────────────────────
async function importAllArticles() {
  // Step 1: Clone or pull the repo
  const repoPath = '/tmp/cp-algorithms-src'
  
  if (!fs.existsSync(repoPath)) {
    console.log('📥 Cloning CP-Algorithms repository...')
    execSync(`git clone --depth=1 https://github.com/cp-algorithms/cp-algorithms ${repoPath}`, 
      { stdio: 'inherit' })
  } else {
    console.log('📥 Pulling latest CP-Algorithms content...')
    execSync(`git -C ${repoPath} pull`, { stdio: 'inherit' })
  }

  const srcPath = path.join(repoPath, 'src')
  let imported = 0
  let skipped = 0

  // Step 2: Walk every slug in our metadata map
  for (const [slug, meta] of Object.entries(TOPIC_META)) {
    const mdPath = path.join(srcPath, `${slug}.md`)
    
    if (!fs.existsSync(mdPath)) {
      console.warn(`⚠️  Not found: ${mdPath}`)
      skipped++
      continue
    }

    const rawContent = fs.readFileSync(mdPath, 'utf-8')
    
    // Extract title from first heading
    const titleMatch = rawContent.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].replace(/¶/g, '').trim() : slug.split('/').pop()!

    // Parse practice problems from the markdown
    const problems = parseProblems(rawContent)

    // Upsert into DB
    await prisma.algorithmArticle.upsert({
      where: { slug },
      create: {
        slug,
        title,
        category: meta.category,
        subcategory: meta.subcategory,
        content: rawContent,      // ← full markdown, nothing cut
        difficulty: meta.difficulty,
        tags: meta.tags,
        problems: {
          create: problems
        }
      },
      update: {
        title,
        content: rawContent,
        difficulty: meta.difficulty,
        tags: meta.tags,
        problems: {
          deleteMany: {},           // clear old problems
          create: problems          // re-insert from fresh parse
        }
      }
    })

    console.log(`✅ ${slug} (${problems.length} problems)`)
    imported++
  }

  console.log(`\n🎯 Done: ${imported} imported, ${skipped} skipped`)
  await prisma.$disconnect()
}

importAllArticles().catch(console.error)
