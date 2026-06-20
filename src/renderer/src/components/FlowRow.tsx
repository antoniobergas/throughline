import type { FeatureFlow, StageId } from "../../../shared/types";
import StageBox from "./StageBox";
import { openUrl } from "../electronApi";

const STAGE_ORDER: StageId[] = ["work", "pr", "checks", "review", "merge", "deploy", "prod"];
const ATTENTION_LABELS: Record<string, string> = {
  check_failed: "checks failed",
  review_requested: "review requested",
  changes_requested: "changes requested",
  deploy_waiting_approval: "approval needed",
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
  const prNumber = prUrl?.match(/\/pull\/(\d+)/)?.[1];

  // Calm rows: no opacity change, just softer border and title color
  const rowBorderColor = hasAttention ? "rgba(242,97,78,0.3)" : "#1E2D3D";
  const titleColor = hasAttention ? "#E8EEF2" : calm ? "#8CA8BE" : "#CDD6DF";

  return (
    <div
      className="flex items-start rounded-lg mb-1.5 relative group transition-colors"
      style={{
        background: "#0D1825",
        border: `1px solid ${rowBorderColor}`,
        minHeight: 68,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(13,24,37,0.98)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#0D1825";
      }}
    >
      {/* Left attention/status bar */}
      <div
        className="self-stretch rounded-l-lg flex-shrink-0"
        style={{
          width: 3,
          background: hasAttention ? "#F2614E" : "#1E2D3D",
          opacity: hasAttention ? 1 : 0.4,
        }}
      />

      {/* Row content */}
      <div className="flex flex-col flex-1 py-2 px-3 min-w-0 gap-1.5">
        {/* Title row */}
        <div className="flex items-center gap-2 min-w-0">
          {/* PR number */}
          {prNumber && (
            <span
              className="text-xs font-mono flex-shrink-0 tabular-nums"
              style={{ color: "#3A5068", letterSpacing: "0.02em" }}
            >
              #{prNumber}
            </span>
          )}

          {/* Title — clickable */}
          <button
            onClick={() => prUrl && openUrl(prUrl)}
            title={prUrl ? "Open PR on GitHub" : flow.title}
            className={`text-sm font-medium truncate text-left bg-transparent border-0 p-0 min-w-0 ${prUrl ? "hover:underline" : ""}`}
            style={{
              color: titleColor,
              cursor: prUrl ? "pointer" : "default",
              textUnderlineOffset: "2px",
              flex: "1 1 0",
            }}
          >
            {flow.title}
          </button>

          {/* Branch badge — always visible but dim on calm */}
          <span
            className="text-xs font-mono flex-shrink-0 hidden sm:inline-block"
            style={{
              color: "#3A5068",
              letterSpacing: "0.01em",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {flow.branch.length > 26 ? flow.branch.slice(0, 26) + "…" : flow.branch}
          </span>

          {/* Attention badges */}
          {hasAttention &&
            flow.needsAttention.map((a, i) => (
              <button
                key={i}
                className="text-xs px-2 py-1 rounded font-medium flex-shrink-0 flex items-center gap-1.5 transition-colors hover:opacity-90"
                style={{
                  background: "rgba(242,97,78,0.12)",
                  color: "#F2614E",
                  border: "1px solid rgba(242,97,78,0.3)",
                }}
                onClick={() => openUrl(a.url)}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M5 1L9.5 9H0.5L5 1Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    fill="none"
                  />
                  <path
                    d="M5 4v1.5M5 7.5h.01"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
                {ATTENTION_LABELS[a.reason] ?? a.reason}
              </button>
            ))}
        </div>

        {/* Stage pipeline */}
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
                  {stageId === "merge" && (
                    <div
                      className="flex-shrink-0 mx-1"
                      style={{
                        width: 2,
                        minHeight: 48,
                        alignSelf: "stretch",
                        background:
                          "repeating-linear-gradient(to bottom, #2A3949 0px, #2A3949 4px, transparent 4px, transparent 8px)",
                      }}
                    />
                  )}
                  <StageBox
                    stage={stage}
                    isLast={i === STAGE_ORDER.length - 1}
                    calm={calm && !hasAttention}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
