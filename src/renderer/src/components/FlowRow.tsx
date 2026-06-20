import type { FeatureFlow, StageId } from "../../../shared/types";
import StageBox from "./StageBox";
import { openUrl } from "../electronApi";

const STAGE_ORDER: StageId[] = ["work", "pr", "checks", "review", "merge", "deploy", "prod"];
const ATTENTION_LABELS: Record<string, string> = {
  check_failed: "checks failed",
  review_requested: "review requested",
  changes_requested: "changes requested",
  deploy_waiting_approval: "deploy approval needed",
  deploy_failed: "deploy failed",
  merge_conflict: "merge conflict",
};

interface Props {
  flow: FeatureFlow;
  calm: boolean;
}

export default function FlowRow({ flow, calm }: Props) {
  const hasAttention = flow.needsAttention.length > 0;

  const stageMap = Object.fromEntries(flow.stages.map((s) => [s.id, s]));

  const prUrl = flow.stages.find((s) => s.id === "pr")?.url;

  return (
    <div
      className="group flex items-start gap-0 rounded-lg mb-2 relative transition-all"
      style={{
        background: "#16212E",
        border: hasAttention ? "1px solid rgba(242,97,78,0.3)" : "1px solid #2A3949",
        opacity: calm && !hasAttention ? 0.8 : 1,
        minHeight: 72,
      }}
    >
      {/* Attention indicator bar */}
      <div
        className="self-stretch rounded-l-lg flex-shrink-0"
        style={{
          width: 4,
          background: hasAttention ? "#F2614E" : "transparent",
        }}
      />

      {/* Row content */}
      <div className="flex flex-col flex-1 py-2 px-3 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => prUrl && openUrl(prUrl)}
            title={prUrl ? "Open PR on GitHub" : flow.title}
            className={`text-sm font-medium truncate text-left bg-transparent border-0 p-0 flex items-center gap-1 ${prUrl ? "hover:underline" : ""}`}
            style={{
              color: hasAttention ? "#E8EEF2" : "#B0BEC5",
              maxWidth: 280,
              cursor: prUrl ? "pointer" : "default",
            }}
          >
            <span className="truncate">{flow.title}</span>
            {prUrl && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.5 }}>
                <path d="M1 9L9 1M9 1H4M9 1V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "#2A3949",
              color: "#7E93A6",
              opacity: calm && !hasAttention ? 0.25 : 1,
            }}
          >
            {flow.branch.length > 28 ? flow.branch.slice(0, 28) + "…" : flow.branch}
          </span>

          {/* Attention badges */}
          {hasAttention &&
            flow.needsAttention.map((a, i) => (
              <button
                key={i}
                className="text-xs px-2 py-1.5 rounded font-medium flex-shrink-0 hover:brightness-110 transition-all flex items-center gap-1.5 min-h-[36px]"
                style={{ background: "rgba(242,97,78,0.18)", color: "#F2614E", border: "1px solid rgba(242,97,78,0.4)" }}
                onClick={() => openUrl(a.url)}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M5.5 1L10 9.5H1L5.5 1Z" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  <path d="M5.5 4.5v2M5.5 8h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {ATTENTION_LABELS[a.reason] ?? a.reason}
              </button>
            ))}
        </div>

        {/* Stage pipeline — horizontally scrollable on narrow screens */}
        <div className="overflow-x-auto -mx-3 px-3" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex items-start" style={{ minWidth: "max-content" }}>
            {STAGE_ORDER.map((stageId, i) => {
              const stage = stageMap[stageId] ?? {
                id: stageId,
                state: "no_data" as const,
                satellites: [],
              };
              return (
                <div key={stageId} className="flex items-start">
                  {/* Merge gate dashed line before MERGE stage */}
                  {stageId === "merge" && (
                    <div
                      className="self-stretch flex items-center mx-1"
                      style={{ borderLeft: "2px dashed #3D5266", minHeight: 56 }}
                    />
                  )}
                  <StageBox stage={stage} isLast={i === STAGE_ORDER.length - 1} calm={calm && !hasAttention} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
