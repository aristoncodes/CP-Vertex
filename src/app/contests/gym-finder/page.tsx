"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useRef, useEffect } from "react";
import { Copy, ExternalLink, Search, Settings2, Users, Tag as TagIcon, X, Check, Loader2 } from "lucide-react";

const CF_TAGS = [
  "2-sat", "binary search", "bitmasks", "brute force", "chinese theorem",
  "combinatorics", "constructive algorithms", "data structures", "dfs and similar",
  "divide and conquer", "dp", "dsu", "expression parsing", "fft", "flows", "games",
  "geometry", "graph matchings", "graphs", "greedy", "hashing", "implementation",
  "interactive", "math", "matrices", "meet-in-the-middle", "number theory",
  "probabilities", "schedules", "shortest paths", "sortings", "string suffix structures",
  "strings", "ternary search", "trees", "two pointers"
];

export default function GymFinderPage() {
  const [handles, setHandles] = useState("");
  const [minRating, setMinRating] = useState(800);
  const [maxRating, setMaxRating] = useState(3500);
  const [maxProblems, setMaxProblems] = useState(50);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  const [loadingState, setLoadingState] = useState<"idle" | "validating" | "fetching" | "filtering" | "done">("idle");
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 25;
  const eventSourceRef = useRef<EventSource | null>(null);

  // Derived state
  const filteredTags = CF_TAGS.filter(t => t.includes(tagInput.toLowerCase()) && !selectedTags.includes(t)).slice(0, 5);
  const filteredResults = results.filter(p => 
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    p.code.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const currentResults = filteredResults.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const startSearch = () => {
    setError("");
    setResults([]);
    setPage(1);

    const handleList = handles.split(/[\s,]+/).filter(Boolean);
    if (handleList.length === 0) {
      setError("Please enter at least one Codeforces handle.");
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setLoadingState("validating");

    const params = new URLSearchParams({
      handles: handleList.join(","),
      minRating: minRating.toString(),
      maxRating: maxRating.toString(),
      maxProblems: maxProblems.toString(),
    });
    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.join(","));
    }

    const eventSource = new EventSource(`/api/contests/gym-finder?${params.toString()}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.stage) {
        case "validating":
          setLoadingState("validating");
          break;
        case "fetching":
          setLoadingState("fetching");
          setFetchProgress({ current: data.current, total: data.total });
          break;
        case "filtering":
          setLoadingState("filtering");
          break;
        case "done":
          setLoadingState("done");
          setResults(data.data);
          eventSource.close();
          setTimeout(() => setLoadingState("idle"), 500);
          break;
        case "error":
          setError(data.message);
          setLoadingState("idle");
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost. Codeforces API may be temporarily unavailable.");
      setLoadingState("idle");
      eventSource.close();
    };
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            ⚡ Gym Problem Finder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Find fresh Codeforces problems that none of your team has solved. Build the perfect gym in seconds.
          </p>
        </div>

        {/* Filters Card */}
        <div className="n-card p-6 space-y-6">
          {/* Rating Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3">
              <Settings2 className="w-4 h-4 text-blue-400" />
              Target Rating Range
            </label>
            <div className="flex items-center gap-4">
              <input type="range" min="800" max="3500" step="100" value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="w-full accent-blue-500" />
              <span className="text-sm font-mono text-slate-400 w-12 text-center">to</span>
              <input type="range" min="800" max="3500" step="100" value={maxRating} onChange={e => setMaxRating(Number(e.target.value))} className="w-full accent-blue-500" />
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-blue-400">
              <span>{minRating}</span>
              <span>{maxRating}</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
              <TagIcon className="w-4 h-4 text-purple-400" />
              Topics & Tags
            </label>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-2 flex flex-wrap gap-2 items-center">
              {selectedTags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full flex items-center gap-1 border border-purple-500/30">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer hover:text-purple-100" onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))} />
                </span>
              ))}
              <input 
                type="text" 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Search tags..." 
                className="bg-transparent border-none text-sm text-slate-200 focus:outline-none flex-1 min-w-[120px]"
              />
            </div>
            {tagInput && filteredTags.length > 0 && (
              <div className="absolute z-10 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-w-xs">
                {filteredTags.map(tag => (
                  <div 
                    key={tag} 
                    className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer"
                    onClick={() => { setSelectedTags([...selectedTags, tag]); setTagInput(""); }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Handles */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Codeforces Handles
              </label>
              <textarea 
                value={handles}
                onChange={e => setHandles(e.target.value)}
                placeholder="tourist, jiangly&#10;Benq" 
                className="w-full h-24 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none"
              />
            </div>

            {/* Max Problems */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                <Settings2 className="w-4 h-4 text-blue-400" />
                Max Problems to Return
              </label>
              <input 
                type="number" 
                value={maxProblems}
                onChange={e => setMaxProblems(Number(e.target.value))}
                min={0}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              <p className="text-xs text-slate-500 mt-2">Set to 0 for unlimited.</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-sm text-red-400">
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button 
            onClick={startSearch}
            disabled={loadingState !== "idle"}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loadingState === "idle" ? (
              <>
                <Search className="w-4 h-4" /> Validate Handles & Search
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loadingState !== "idle" && (
          <div className="n-card p-8 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <div>
              <div className="text-sm font-semibold text-slate-200">
                {loadingState === "validating" && "Validating handles..."}
                {loadingState === "fetching" && `Fetching submissions (${fetchProgress.current}/${fetchProgress.total})...`}
                {loadingState === "filtering" && "Intersecting data & filtering..."}
                {loadingState === "done" && "Done!"}
              </div>
              <div className="text-xs text-slate-400 mt-1">Please wait while we process your request</div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && loadingState === "idle" && (
          <div className="n-card p-0 overflow-hidden" id="results">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-200">Unsolved Problems</h3>
                <p className="text-xs text-slate-400 mt-1">Found <span className="text-blue-400 font-medium">{filteredResults.length}</span> problems</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchFilter}
                  onChange={e => {setSearchFilter(e.target.value); setPage(1);}}
                  placeholder="Filter results..."
                  className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-sm text-slate-200 focus:outline-none focus:border-slate-700 w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Problem Name</th>
                    <th className="px-4 py-3 font-medium text-center">Rating</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {currentResults.map(p => (
                    <tr key={p.code} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-300">{p.code}</td>
                      <td className="px-4 py-3 text-slate-200">{p.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          p.rating < 1200 ? "text-slate-400 bg-slate-400/10" :
                          p.rating < 1400 ? "text-green-400 bg-green-400/10" :
                          p.rating < 1600 ? "text-cyan-400 bg-cyan-400/10" :
                          p.rating < 1900 ? "text-blue-400 bg-blue-400/10" :
                          p.rating < 2100 ? "text-purple-400 bg-purple-400/10" :
                          p.rating < 2400 ? "text-orange-400 bg-orange-400/10" :
                          "text-red-500 bg-red-500/10"
                        }`}>
                          {p.rating}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                              {t}
                            </span>
                          ))}
                          {p.tags.length > 3 && <span className="text-[10px] text-slate-500">+{p.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => copyToClipboard(p.code)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors" title="Copy code">
                            <Copy className="w-4 h-4" />
                          </button>
                          <a href={`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`} target="_blank" rel="noreferrer" className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors" title="Open on Codeforces">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {currentResults.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No problems match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
