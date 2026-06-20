import { useEffect, useState } from "react";

interface Props {
  needsAttentionCount: number;
  activeAgentCount: number;
  onlyNeedsAttention: boolean;
  onToggleFilter: () => void;
  repos: string[];
  selectedRepo: string;
  onSelectRepo: (r: string) => void;
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
  selectedRepo,
  onSelectRepo,
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

      {/* Repo selector */}
      {hasToken && repos.length > 0 && (
        <select
          className="text-sm rounded px-2 py-1.5 border outline-none cursor-pointer min-h-[44px]"
          style={{ background: "#0E1620", borderColor: "#2A3949", color: "#E8EEF2" }}
          value={selectedRepo}
          onChange={(e) => onSelectRepo(e.target.value)}
        >
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
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
        <span className="text-xs" style={{ color: "#4A6070" }}>
          {updatedLabel}
        </span>
      )}

      {/* Needs-you filter */}
      {needsAttentionCount > 0 && (
        <button
          className="text-xs px-2.5 py-2.5 rounded font-medium transition-all min-h-[44px] flex items-center"
          style={{
            background: onlyNeedsAttention ? "#F2614E" : "rgba(242,97,78,0.12)",
            color: onlyNeedsAttention ? "#fff" : "#F2614E",
            border: "1px solid rgba(242,97,78,0.4)",
          }}
          onClick={onToggleFilter}
        >
          ⚠ needs you ({needsAttentionCount})
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
        className="text-xs px-2.5 py-2.5 rounded font-medium hover:bg-white/5 transition-colors min-h-[44px] flex items-center"
        style={{ color: "#7E93A6", border: "1px solid #2A3949" }}
        onClick={onOpenSettings}
      >
        ⚙ Settings
      </button>
    </div>
  );
}
