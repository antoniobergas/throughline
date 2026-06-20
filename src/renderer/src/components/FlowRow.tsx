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

  return (
    <div
      className="flex items-start gap-0 rounded-lg mb-2 relative transition-all"
      style={{
        background: "#16212E",
        border: hasAttention ? "1px solid rgba(242,97,78,0.3)" : "1px solid #2A3949",
        opacity: calm && !hasAttention ? 0.65 : 1,
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
          <span
            className="text-sm font-medium truncate"
            style={{ color: hasAttention ? "#E8EEF2" : "#B0BEC5", maxWidth: 280 }}
            title={flow.title}
          >
            {flow.title}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0" style={{ background: "#2A3949", color: "#7E93A6" }}>
            {flow.branch.length > 28 ? flow.branch.slice(0, 28) + "…" : flow.branch}
          </span>

          {/* Attention badges */}
          {hasAttention &&
            flow.needsAttention.map((a, i) => (
              <button
                key={i}
                className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 hover:brightness-110 transition-all"
                style={{ background: "rgba(242,97,78,0.18)", color: "#F2614E", border: "1px solid rgba(242,97,78,0.4)" }}
                onClick={() => openUrl(a.url)}
              >
                ⚠ {ATTENTION_LABELS[a.reason] ?? a.reason}
              </button>
            ))}
        </div>

        {/* Stage pipeline */}
        <div className="flex items-start">
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
                    style={{ borderLeft: "2px dashed #2A3949", height: 52 }}
                  />
                )}
                <StageBox stage={stage} isLast={i === STAGE_ORDER.length - 1} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
