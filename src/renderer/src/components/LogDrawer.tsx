import { useEffect, useRef, useState } from "react";
import type { WorkflowRun } from "../../../shared/types";
import { getWorkflowLogs, abortWorkflow, onWorkflowLog, openUrl } from "../electronApi";

interface Props {
  run: WorkflowRun;
  onClose: () => void;
}

const STATUS_COLOR: Record<WorkflowRun["status"], string> = {
  cloning:  "#F4A94B",
  running:  "#38E1C6",
  done:     "#4ADE80",
  failed:   "#F2614E",
  aborted:  "#5A7389",
};

export default function LogDrawer({ run, onClose }: Props) {
  const [logs, setLogs] = useState<string[]>([]);
  const [live, setLive] = useState(run.status === "cloning" || run.status === "running");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load existing logs
  useEffect(() => {
    getWorkflowLogs(run.id).then(setLogs).catch(() => {});
  }, [run.id]);

  // Subscribe to live log stream
  useEffect(() => {
    if (!live) return;
    const unsub = onWorkflowLog(run.id, (line) => {
      setLogs((prev) => [...prev, line]);
    });
    return unsub;
  }, [run.id, live]);

  // Stop live when done
  useEffect(() => {
    if (run.status !== "cloning" && run.status !== "running") setLive(false);
  }, [run.status]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const statusColor = STATUS_COLOR[run.status] ?? "#5A7389";
  const isActive = run.status === "cloning" || run.status === "running";

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex flex-col"
      style={{ width: "460px", background: "#080E14", borderLeft: "1px solid #1E2D3D" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b" style={{ borderColor: "#1E2D3D" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: statusColor,
                ...(isActive ? { animation: "status-dot-pulse 1.5s ease-in-out infinite" } : {}),
              }}
            />
            <span className="text-xs font-semibold truncate" style={{ color: "#CDD6DF" }}>
              {run.repoDisplay}
            </span>
          </div>
          <p className="text-xs mt-1 line-clamp-2" style={{ color: "#5A7389" }}>
            {run.description}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs font-mono" style={{ color: "#3A5068" }}>{run.branch}</span>
            <span className="text-xs" style={{ color: statusColor }}>{run.status}</span>
            {run.subagentIndex && (
              <span className="text-xs" style={{ color: "#3A5068" }}>agent #{run.subagentIndex}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isActive && (
            <button
              className="text-xs px-2.5 py-1.5 rounded transition-colors"
              style={{ border: "1px solid rgba(242,97,78,0.4)", color: "#F2614E" }}
              onClick={() => abortWorkflow(run.id).catch(() => {})}
            >
              Abort
            </button>
          )}
          {run.prUrl && (
            <button
              className="text-xs px-2.5 py-1.5 rounded transition-colors"
              style={{ border: "1px solid rgba(74,222,128,0.4)", color: "#4ADE80" }}
              onClick={() => openUrl(run.prUrl!)}
            >
              Open PR
            </button>
          )}
          <button
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/5 transition-colors ml-1"
            style={{ color: "#5A7389" }}
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Log body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {logs.length === 0 ? (
          <p className="text-xs" style={{ color: "#3A5068" }}>
            {isActive ? "Waiting for output…" : "No output captured."}
          </p>
        ) : (
          <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words" style={{ color: "#8CA8BE", fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace" }}>
            {logs.join("\n")}
          </pre>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer status */}
      {run.status === "done" && run.prUrl && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "#1E2D3D" }}>
          <button
            className="w-full py-2.5 rounded text-sm font-semibold transition-all"
            style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ADE80" }}
            onClick={() => openUrl(run.prUrl!)}
          >
            View Pull Request #{run.prNumber} →
          </button>
        </div>
      )}
    </div>
  );
}
