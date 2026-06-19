export interface MockProblem {
  id: string;
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  solvedCount: number;
  status?: "solved" | "attempted" | "unsolved";
}

export const mockProblems: MockProblem[] = [
  { id: "1234A", contestId: 1234, index: "A", name: "Beautiful Matrix Partition", rating: 1900, tags: ["dp", "greedy", "binary search"], solvedCount: 14302, status: "solved" },
  { id: "1987F", contestId: 1987, index: "F", name: "Segment Tree of Destiny", rating: 2800, tags: ["data structures", "trees"], solvedCount: 892, status: "unsolved" },
  { id: "1823C", contestId: 1823, index: "C", name: "Lazy Propagation Blues", rating: 1600, tags: ["graphs", "BFS"], solvedCount: 5441, status: "attempted" },
  { id: "1456B", contestId: 1456, index: "B", name: "Greedy Exchange Rate", rating: 1200, tags: ["greedy", "math"], solvedCount: 23455, status: "solved" },
  { id: "1789D", contestId: 1789, index: "D", name: "Binary String Folding", rating: 2100, tags: ["dp", "strings", "binary search"], solvedCount: 3421, status: "solved" },
  { id: "1567E", contestId: 1567, index: "E", name: "Graph Coloring Under Constraints", rating: 2800, tags: ["graphs", "coloring", "constructive"], solvedCount: 712, status: "unsolved" },
  { id: "1345A", contestId: 1345, index: "A", name: "Two Sum Revisited", rating: 800, tags: ["implementation", "math"], solvedCount: 89234, status: "solved" },
  { id: "1678C", contestId: 1678, index: "C", name: "Minimum Spanning Distance", rating: 1500, tags: ["graphs", "greedy", "sorting"], solvedCount: 8923, status: "solved" },
  { id: "1890B", contestId: 1890, index: "B", name: "Bracket Sequence Restoration", rating: 1400, tags: ["greedy", "strings", "stack"], solvedCount: 12456, status: "solved" },
  { id: "1923F", contestId: 1923, index: "F", name: "Persistent Segment Sorcery", rating: 2600, tags: ["data structures", "segment tree"], solvedCount: 456, status: "unsolved" },
  { id: "1567B", contestId: 1567, index: "B", name: "XOR Wonderland", rating: 1100, tags: ["bitmasks", "math"], solvedCount: 34567, status: "solved" },
  { id: "1812D", contestId: 1812, index: "D", name: "Counting Inversions Fast", rating: 2000, tags: ["divide and conquer", "merge sort"], solvedCount: 4521, status: "attempted" },
  { id: "1743C", contestId: 1743, index: "C", name: "Knapsack Variations", rating: 1700, tags: ["dp", "knapsack"], solvedCount: 6789, status: "unsolved" },
  { id: "1901A", contestId: 1901, index: "A", name: "Simple Addition", rating: 900, tags: ["math", "implementation"], solvedCount: 67890, status: "solved" },
  { id: "1856E", contestId: 1856, index: "E", name: "Flow Network Mastery", rating: 2400, tags: ["flows", "graphs"], solvedCount: 1234, status: "unsolved" },
  { id: "1778B", contestId: 1778, index: "B", name: "Suffix Array Construction", rating: 1800, tags: ["strings", "suffix array"], solvedCount: 3456, status: "attempted" },
  { id: "1634C", contestId: 1634, index: "C", name: "Tree DP Basics", rating: 1600, tags: ["dp", "trees", "DFS"], solvedCount: 7890, status: "solved" },
  { id: "1945D", contestId: 1945, index: "D", name: "Convex Hull Trick", rating: 2300, tags: ["dp", "geometry", "optimization"], solvedCount: 2345, status: "unsolved" },
  { id: "1502A", contestId: 1502, index: "A", name: "Frequency Count", rating: 1000, tags: ["implementation", "sorting"], solvedCount: 45678, status: "solved" },
  { id: "1867F", contestId: 1867, index: "F", name: "Centroid Decomposition Query", rating: 2700, tags: ["trees", "divide and conquer"], solvedCount: 567, status: "unsolved" },
];

export interface MockTopicStrength {
  tag: string;
  score: number;
  trend: "up" | "down" | "flat";
  solved: number;
  attempted: number;
}

export const mockTopicStrengths: MockTopicStrength[] = [
  { tag: "DP", score: 73, trend: "up", solved: 89, attempted: 120 },
  { tag: "Binary Search", score: 38, trend: "down", solved: 23, attempted: 60 },
  { tag: "Graphs", score: 61, trend: "flat", solved: 45, attempted: 74 },
  { tag: "Seg Trees", score: 12, trend: "down", solved: 3, attempted: 25 },
  { tag: "Number Theory", score: 85, trend: "up", solved: 67, attempted: 79 },
  { tag: "Greedy", score: 78, trend: "flat", solved: 112, attempted: 143 },
  { tag: "Strings", score: 54, trend: "up", solved: 34, attempted: 63 },
  { tag: "Sorting", score: 91, trend: "flat", solved: 54, attempted: 59 },
  { tag: "Geometry", score: 22, trend: "down", solved: 5, attempted: 23 },
  { tag: "Flows", score: 8, trend: "down", solved: 1, attempted: 12 },
];

export interface MockMission {
  id: string;
  label: string;
  type: string;
  xp: number;
  done: boolean;
}

export const mockMissions: MockMission[] = [
  { id: "m1", label: "Solve 2 Binary Search problems", type: "WEAK ZONE · 42% AC RATE", xp: 100, done: false },
  { id: "m2", label: "Win your first 1v1 Duel", type: "COMBAT REWARD", xp: 150, done: false },
  { id: "m3", label: "Beat a Boss Fight", type: "RATED 400 ABOVE YOUR LEVEL", xp: 500, done: false },
];

export interface MockCoachInsight {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
}

export const mockCoachInsights: MockCoachInsight[] = [
  { type: "declining_score", message: "Your Binary Search score dropped from 56 → 38 this week. You're rushing — avg attempt time is 4 min but problems at your level need 12.", priority: "high" },
  { type: "improvement", message: "Your DP skills improved +12 points this month. You're solving harder problems — keep pushing into the 1800+ range.", priority: "low" },
  { type: "blind_spot", message: "You have never solved a Segment Tree problem. 847 users at your rating have. Try one today.", priority: "medium" },
];

export const mockUser = {
  name: "Arjun",
  handle: "arjun_cp",
  rating: 1724,
  maxRating: 1812,
  level: 42,
  title: "Expert Coder",
  xp: 68400,
  xpForNextLevel: 100000,
  streak: 47,
  longestStreak: 47,
  totalSolved: 847,
  totalXP: 68400,
  joinDate: "2024-08-15",
};

/** Generate heatmap data for last 90 days */
export function generateHeatmapData(): number[] {
  const data: number[] = [];
  for (let i = 0; i < 90; i++) {
    const r = Math.random();
    if (r > 0.85) data.push(4);
    else if (r > 0.65) data.push(3);
    else if (r > 0.45) data.push(2);
    else if (r > 0.3) data.push(1);
    else data.push(0);
  }
  return data;
}
