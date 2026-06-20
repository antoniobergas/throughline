import type { WorkflowRun } from "../../../shared/types";
import { openUrl } from "../electronApi";

interface Props {
  runs: WorkflowRun[];            // 1 standalone or N sibling subagents
  onClickAgent: (run: WorkflowRun) => void;
}

const STATUS_COLOR: Record<WorkflowRun["status"], string> = {
  cloning:  "#F4A94B",
  running:  "#38E1C6",
  done:     "#4ADE80",
  failed:   "#F2614E",
  aborted:  "#5A7389",
};

function AgentChip({ run, onClick }: { run: WorkflowRun; onClick: () => void }) {
  const color = STATUS_COLOR[run.status] ?? "#5A7389";
  const isActive = run.status === "cloning" || run.status === "running";
  const label = run.subagentIndex != null ? String(run.subagentIndex) : "1";

  return (
    <button
      className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-all hover:brightness-125"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}40`,
        color,
        fontSize: "10px",
        fontFamily: "ui-monospace, monospace",
        lineHeight: 1,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`Agent ${label} — ${run.status}${run.prUrl ? " · PR created" : ""}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: color,
          ...(isActive ? { animation: "status-dot-pulse 1.5s ease-in-out infinite", animationDelay: `${(parseInt(label) - 1) * 150}ms` } : {}),
        }}
      />
      {label}
      {run.prUrl && (
        <span style={{ color, opacity: 0.7, marginLeft: 1 }}>↗</span>
      )}
    </button>
  );
}

export default function WorkflowRunCard({ runs, onClickAgent }: Props) {
  const primary = runs[0];
  if (!primary) return null;

  // Base branch = strip /agent-N suffix
  const baseBranch = primary.branch.replace(/\/agent-\d+$/, "");
  const branchShort = baseBranch.split("/").slice(-2).join("/");

  // Overall group status: running > cloning > failed > done > aborted
  const groupStatus = (() => {
    if (runs.some((r) => r.status === "running")) return "running";
    if (runs.some((r) => r.status === "cloning")) return "cloning";
    if (runs.some((r) => r.status === "failed")) return "failed";
    if (runs.every((r) => r.status === "done")) return "done";
    if (runs.every((r) => r.status === "aborted")) return "aborted";
    return "running";
  })();

  const statusColor = STATUS_COLOR[groupStatus] ?? "#5A7389";
  const isActive = groupStatus === "cloning" || groupStatus === "running";
  const shortDesc = primary.description.length > 72
    ? primary.description.slice(0, 72) + "…"
    : primary.description;

  const anyPr = runs.find((r) => r.prUrl);

  return (
    <div
      className="flex items-center gap-3 rounded-lg mb-1.5 px-3 py-2 cursor-pointer hover:brightness-110 transition-all"
      style={{
        background: "#0D1825",
        border: "1px solid #1E2D3D",
        borderLeft: `3px solid ${statusColor}`,
        minHeight: 40,
      }}
      onClick={() => onClickAgent(primary)}
    >
      {/* Status dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: statusColor,
          ...(isActive ? { animation: "status-dot-pulse 1.5s ease-in-out infinite" } : {}),
        }}
      />

      {/* Branch */}
      <span
        className="text-xs font-mono flex-shrink-0"
        style={{ color: "#5A7389", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {branchShort}
      </span>

      <span style={{ color: "#2E4257", flexShrink: 0 }}>·</span>

      {/* Description */}
      <span
        className="text-xs flex-1 min-w-0 truncate"
        style={{ color: "#8CA8BE" }}
      >
        {shortDesc}
      </span>

      {/* Agent chips */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {runs.map((run) => (
          <AgentChip key={run.id} run={run} onClick={() => onClickAgent(run)} />
        ))}
      </div>

      {/* PR link if any agent created one */}
      {anyPr && (
        <button
          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
          style={{ border: "1px solid rgba(74,222,128,0.35)", color: "#4ADE80", fontSize: "10px" }}
          onClick={(e) => { e.stopPropagation(); openUrl(anyPr.prUrl!); }}
        >
          PR
        </button>
      )}
    </div>
  );
}
