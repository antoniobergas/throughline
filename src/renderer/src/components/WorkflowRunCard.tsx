import type { WorkflowRun } from "../../../shared/types";
import { openUrl } from "../electronApi";

interface Props {
  run: WorkflowRun;
  onClick: () => void;
}

const STATUS_COLOR: Record<WorkflowRun["status"], string> = {
  cloning:  "#F4A94B",
  running:  "#38E1C6",
  done:     "#4ADE80",
  failed:   "#F2614E",
  aborted:  "#5A7389",
};

const STATUS_LABEL: Record<WorkflowRun["status"], string> = {
  cloning:  "cloning",
  running:  "running",
  done:     "done",
  failed:   "failed",
  aborted:  "aborted",
};

const PROVIDER_LABEL: Record<string, string> = {
  "claude-code": "Claude",
  "aider":       "Aider",
  "copilot":     "Copilot",
};

export default function WorkflowRunCard({ run, onClick }: Props) {
  const statusColor = STATUS_COLOR[run.status] ?? "#5A7389";
  const isActive = run.status === "cloning" || run.status === "running";
  const elapsed = run.endedAt
    ? Math.round((run.endedAt - run.startedAt) / 1000)
    : Math.round((Date.now() - run.startedAt) / 1000);

  return (
    <div
      className="rounded-lg mb-1.5 cursor-pointer transition-all hover:brightness-110 flex items-center gap-3 px-3 py-2.5"
      style={{
        background: "#0D1825",
        border: `1px solid #1E2D3D`,
        borderLeft: `3px solid ${statusColor}`,
      }}
      onClick={onClick}
    >
      {/* Status dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: statusColor,
          ...(isActive ? { animation: "status-dot-pulse 1.5s ease-in-out infinite" } : {}),
        }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate" style={{ color: "#CDD6DF" }}>
            {run.description.length > 60 ? run.description.slice(0, 60) + "…" : run.description}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono" style={{ color: "#3A5068" }}>
            {run.repoDisplay}
          </span>
          <span style={{ color: "#2E4257" }}>·</span>
          <span className="text-xs font-mono" style={{ color: "#3A5068" }}>
            {run.branch.split("/").pop()}
          </span>
          {run.subagentIndex && (
            <>
              <span style={{ color: "#2E4257" }}>·</span>
              <span className="text-xs" style={{ color: "#3A5068" }}>#{run.subagentIndex}</span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs" style={{ color: "#3A5068" }}>
          {PROVIDER_LABEL[run.provider] ?? run.provider}
        </span>
        <span className="text-xs" style={{ color: statusColor }}>
          {STATUS_LABEL[run.status]}
        </span>
        {isActive && (
          <span className="text-xs font-mono" style={{ color: "#3A5068" }}>{elapsed}s</span>
        )}
        {run.prUrl && (
          <button
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{ border: "1px solid rgba(74,222,128,0.3)", color: "#4ADE80" }}
            onClick={(e) => { e.stopPropagation(); openUrl(run.prUrl!); }}
          >
            PR
          </button>
        )}
        {/* Chevron */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: "#3A5068" }}>
          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
