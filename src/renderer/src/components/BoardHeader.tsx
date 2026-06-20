import { useEffect, useRef, useState } from "react";

interface Props {
  needsAttentionCount: number;
  activeAgentCount: number;
  onlyNeedsAttention: boolean;
  onToggleFilter: () => void;
  repos: string[];
  selectedRepos: string[];
  onSelectRepos: (repos: string[]) => void;
  onOpenSettings: () => void;
  onNewWorkflow: () => void;
  hasToken: boolean;
  loading: boolean;
  lastUpdatedAt: Date | null;
  onRefresh: () => void;
}

export default function BoardHeader({
  needsAttentionCount,
  activeAgentCount,
  onlyNeedsAttention,
  onToggleFilter,
  repos,
  selectedRepos,
  onSelectRepos,
  onOpenSettings,
  onNewWorkflow,
  hasToken,
  loading,
  lastUpdatedAt,
  onRefresh,
}: Props) {
  const [, setTick] = useState(0);
  const [repoOpen, setRepoOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const repoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!repoOpen) return;
    const handler = (e: MouseEvent) => {
      if (!repoDropdownRef.current?.contains(e.target as Node)) {
        setRepoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [repoOpen]);

  const updatedLabel = (() => {
    if (!lastUpdatedAt) return null;
    const diffMin = Math.floor((Date.now() - lastUpdatedAt.getTime()) / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin === 1) return "1 min ago";
    return `${diffMin} min ago`;
  })();

  const filteredRepos = repos.filter((r) =>
    r.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const toggleRepo = (r: string) => {
    if (selectedRepos.includes(r)) {
      if (selectedRepos.length > 1) {
        onSelectRepos(selectedRepos.filter((x) => x !== r));
      }
    } else if (selectedRepos.length < 6) {
      onSelectRepos([...selectedRepos, r]);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 border-b sticky top-0 z-10 flex-shrink-0"
      style={{ background: "#0D1825", borderColor: "#1E2D3D", height: 48 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(56,225,198,0.1)",
            border: "1px solid rgba(56,225,198,0.25)",
          }}
        >
          <span
            style={{
              color: "#38E1C6",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              lineHeight: 1,
            }}
          >
            tl
          </span>
        </div>
        <span
          className="font-semibold text-sm"
          style={{ color: "#CDD6DF", letterSpacing: "-0.02em" }}
        >
          throughline
        </span>
      </div>

      {/* Separator */}
      <div className="w-px self-stretch my-2.5 flex-shrink-0" style={{ background: "#1E2D3D" }} />

      {/* Watching label + repo chips */}
      {hasToken && (
        <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
          <span className="text-xs flex-shrink-0" style={{ color: "#3A5068" }}>watching</span>

          {/* Selected repo chips */}
          {selectedRepos.map((r) => {
            const name = r.split("/")[1] ?? r;
            const canRemove = selectedRepos.length > 1;
            return (
              <span
                key={r}
                className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md flex-shrink-0"
                style={{ background: "rgba(56,225,198,0.08)", border: "1px solid rgba(56,225,198,0.2)", color: "#38E1C6" }}
              >
                {name}
                {canRemove && (
                  <button
                    className="transition-colors hover:text-red-400 flex-shrink-0"
                    style={{ color: "#2E7A6E", lineHeight: 1, fontSize: 13 }}
                    onClick={() => onSelectRepos(selectedRepos.filter((x) => x !== r))}
                    title={`Stop watching ${r}`}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}

          {/* Add repo button + dropdown */}
          {repos.length > selectedRepos.length && selectedRepos.length < 6 && (
            <div className="relative flex-shrink-0" ref={repoDropdownRef}>
              <button
                className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-white/5"
                style={{ border: "1px solid #1E2D3D", color: "#5A7389" }}
                onClick={() => { setRepoOpen((v) => !v); setRepoSearch(""); }}
                title="Watch another repo"
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>

              {repoOpen && (
                <div
                  className="absolute top-full mt-1 left-0 rounded-lg shadow-2xl z-50 overflow-hidden"
                  style={{ background: "#0D1825", border: "1px solid #1E2D3D", minWidth: 220, maxWidth: 300 }}
                >
                  <div className="px-2 py-2" style={{ borderBottom: "1px solid #1E2D3D" }}>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "#080E14", border: "1px solid #1E2D3D" }}>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: "#5A7389", flexShrink: 0 }}>
                        <circle cx="4.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M7 7l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <input
                        className="flex-1 bg-transparent outline-none text-xs"
                        style={{ color: "#CDD6DF", caretColor: "#38E1C6" }}
                        placeholder="Search repos…"
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="py-1 overflow-y-auto" style={{ maxHeight: 220 }}>
                    {filteredRepos.filter((r) => !selectedRepos.includes(r)).length === 0 ? (
                      <div className="px-3 py-2 text-xs" style={{ color: "#5A7389" }}>No more repos</div>
                    ) : (
                      filteredRepos
                        .filter((r) => !selectedRepos.includes(r))
                        .map((r) => (
                          <button
                            key={r}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                            style={{ color: "#8CA8BE" }}
                            onClick={() => { toggleRepo(r); setRepoOpen(false); }}
                          >
                            <span className="font-mono truncate">
                              <span style={{ color: "#3A4D61" }}>{r.split("/")[0]}/</span>
                              <span>{r.split("/")[1]}</span>
                            </span>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active agents pill */}
      {activeAgentCount > 0 && (
        <div
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: "rgba(56,225,198,0.08)",
            border: "1px solid rgba(56,225,198,0.2)",
            color: "#38E1C6",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full status-dot-running flex-shrink-0"
            style={{ backgroundColor: "#38E1C6" }}
          />
          {activeAgentCount} active
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Timestamp */}
      {updatedLabel && (
        <span
          className="text-xs tabular-nums flex-shrink-0"
          style={{ color: "#3A4D61", letterSpacing: "0.01em" }}
        >
          {updatedLabel}
        </span>
      )}

      {/* Needs-you filter */}
      {(needsAttentionCount > 0 || onlyNeedsAttention) && (
        <button
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0"
          style={{
            background: onlyNeedsAttention
              ? "#F2614E"
              : "rgba(242,97,78,0.1)",
            color: onlyNeedsAttention ? "#fff" : "#F2614E",
            border: "1px solid rgba(248,113,113,0.35)",
          }}
          onClick={onToggleFilter}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M6 1L11 10H1L6 1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M6 5v2M6 8.5h.01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {needsAttentionCount > 0
            ? `needs you (${needsAttentionCount})`
            : "show all"}
        </button>
      )}

      {/* Refresh */}
      {hasToken && (
        <button
          className="flex items-center justify-center rounded transition-colors hover:bg-white/5 flex-shrink-0"
          style={{ width: 32, height: 32, color: "#5A7389" }}
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            aria-hidden="true"
            className={loading ? "opacity-40" : ""}
          >
            <path
              d="M11 6.5A4.5 4.5 0 1 1 6.5 2c1.2 0 2.3.47 3.1 1.25L11 5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M9 5h2V3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* New Workflow */}
      <button
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-semibold transition-all flex-shrink-0"
        style={{ background: "#38E1C6", color: "#080E14" }}
        onClick={onNewWorkflow}
        title="New Workflow"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        New
      </button>

      {/* Settings */}
      <button
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium hover:bg-white/5 transition-colors flex-shrink-0"
        style={{ color: "#5A7389" }}
        onClick={onOpenSettings}
        title="Settings"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        Settings
      </button>
    </div>
  );
}
