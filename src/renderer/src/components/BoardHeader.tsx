import { useEffect, useState } from "react";

interface Props {
  needsAttentionCount: number;
  activeAgentCount: number;
  onlyNeedsAttention: boolean;
  onToggleFilter: () => void;
  repos: string[];
  selectedRepos: string[];
  onSelectRepos: (repos: string[]) => void;
  onOpenSettings: () => void;
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
  hasToken,
  loading,
  lastUpdatedAt,
  onRefresh,
}: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const updatedLabel = (() => {
    if (!lastUpdatedAt) return null;
    const diffMin = Math.floor((Date.now() - lastUpdatedAt.getTime()) / 60_000);
    if (diffMin < 1) return "Updated just now";
    if (diffMin === 1) return "Updated 1 min ago";
    return `Updated ${diffMin} min ago`;
  })();

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 border-b sticky top-0 z-10"
      style={{ background: "#16212E", borderColor: "#2A3949" }}
    >
      {/* App name */}
      <span className="font-bold tracking-tight text-lg" style={{ color: "#38E1C6", letterSpacing: "-0.02em" }}>
        throughline
      </span>

      {/* Multi-repo chip selector */}
      {hasToken && repos.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedRepos.map((r) => (
            <span
              key={r}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{ background: "#0E1620", border: "1px solid #2A3949", color: "#E8EEF2" }}
            >
              <span className="font-mono">{r.split("/")[1] ?? r}</span>
              {selectedRepos.length > 1 && (
                <button
                  className="ml-0.5 hover:text-red-400 transition-colors"
                  style={{ color: "#7E93A6", fontSize: "14px", lineHeight: 1 }}
                  onClick={() => onSelectRepos(selectedRepos.filter((x) => x !== r))}
                  title={`Remove ${r}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {selectedRepos.length < 6 && repos.filter((r) => !selectedRepos.includes(r)).length > 0 && (
            <select
              className="text-xs rounded px-1.5 py-1 border outline-none cursor-pointer"
              style={{ background: "#0E1620", borderColor: "#2A3949", color: "#7E93A6" }}
              value=""
              onChange={(e) => {
                if (e.target.value) onSelectRepos([...selectedRepos, e.target.value]);
              }}
            >
              <option value="" disabled>＋ repo</option>
              {repos
                .filter((r) => !selectedRepos.includes(r))
                .map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
            </select>
          )}
        </div>
      )}

      {/* Active agents pill */}
      {activeAgentCount > 0 && (
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "rgba(56,225,198,0.12)", color: "#38E1C6", border: "1px solid rgba(56,225,198,0.25)" }}
        >
          {activeAgentCount} agent{activeAgentCount !== 1 ? "s" : ""} active
        </span>
      )}

      <div className="flex-1" />

      {/* Last updated timestamp */}
      {updatedLabel && (
        <span className="text-xs" style={{ color: "#7E93A6" }}>
          {updatedLabel}
        </span>
      )}

      {/* Needs-you filter */}
      {(needsAttentionCount > 0 || onlyNeedsAttention) && (
        <button
          className="text-xs px-2.5 py-2.5 rounded font-medium transition-all min-h-[44px] flex items-center gap-1"
          style={{
            background: onlyNeedsAttention ? "#F2614E" : "rgba(242,97,78,0.12)",
            color: onlyNeedsAttention ? "#fff" : "#F2614E",
            border: "1px solid rgba(242,97,78,0.4)",
          }}
          onClick={onToggleFilter}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{flexShrink:0}}>
            <path d="M6 1L11 10H1L6 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M6 5v2M6 8.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {needsAttentionCount > 0 ? `needs you (${needsAttentionCount})` : "show all"}
        </button>
      )}

      {/* Refresh */}
      {hasToken && (
        <button
          className="text-xs rounded hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{ color: "#7E93A6" }}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "…" : "↻"}
        </button>
      )}

      {/* Settings */}
      <button
        className="text-xs px-2.5 py-2.5 rounded font-medium hover:bg-white/5 transition-colors min-h-[44px] flex items-center gap-1"
        style={{ color: "#7E93A6", border: "1px solid #2A3949" }}
        onClick={onOpenSettings}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{flexShrink:0}}>
          <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Settings
      </button>
    </div>
  );
}
