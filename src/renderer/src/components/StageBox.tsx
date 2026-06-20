import { openUrl } from "../electronApi";
import type { Stage, StageId } from "../../../shared/types";
import SatelliteChip from "./SatelliteChip";

const STAGE_LABELS: Record<StageId, string> = {
  work: "WORK",
  pr: "PR",
  checks: "CHECKS",
  review: "REVIEW",
  merge: "MERGE",
  deploy: "DEPLOY",
  prod: "PROD",
};

interface BoxStyleProps {
  borderColor: string;
  background: string;
  opacity: number;
  animation?: string;
}

function getBoxStyle(state: Stage["state"]): BoxStyleProps {
  switch (state) {
    case "done":
      return { borderColor: "#6FD08C", background: "rgba(111,208,140,0.06)", opacity: 1 };
    case "active":
      return { borderColor: "#38E1C6", background: "rgba(56,225,198,0.06)", opacity: 1, animation: "active" };
    case "failed":
      return { borderColor: "#F2614E", background: "rgba(242,97,78,0.08)", opacity: 1 };
    case "pending":
      return { borderColor: "#2A3949", background: "transparent", opacity: 0.55 };
    case "no_data":
      return { borderColor: "#2A3949", background: "transparent", opacity: 0.4 };
  }
}

interface Props {
  stage: Stage;
  isLast?: boolean;
  calm?: boolean;
}

export default function StageBox({ stage, isLast, calm }: Props) {
  const style = getBoxStyle(stage.state);
  const isActive = stage.state === "active";
  const hasSatellites = stage.satellites.length > 0;
  const hasUrl = !!(stage.logUrl ?? stage.url);

  const handleClick = () => {
    const url = stage.logUrl ?? stage.url;
    if (url) openUrl(url);
  };

  const titleAttr = stage.summary
    ? stage.summary
    : stage.logUrl
      ? "Open log"
      : stage.url
        ? "Open on GitHub"
        : undefined;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        {/* Stage box */}
        <div
          role={hasUrl ? "button" : undefined}
          tabIndex={hasUrl ? 0 : undefined}
          aria-label={`${STAGE_LABELS[stage.id]} stage — ${stage.state}`}
          className={`relative flex flex-col items-center justify-center rounded transition-all select-none ${hasUrl ? "cursor-pointer hover:brightness-110" : "cursor-default"} ${isActive && !calm ? "animate-active-pulse" : ""}`}
          style={{
            width: 80,
            minHeight: 56,
            border: `2px solid ${style.borderColor}`,
            background: style.background,
            opacity: style.opacity,
            boxShadow: isActive && !calm ? `0 0 12px ${style.borderColor}40` : undefined,
          }}
          onClick={hasUrl ? handleClick : undefined}
          onKeyDown={hasUrl ? (e) => { if (e.key === "Enter" || e.key === " ") handleClick(); } : undefined}
          title={titleAttr}
        >
          {/* State indicator dot for done */}
          {stage.state === "done" && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#6FD08C" }} />
          )}
          <span
            className="font-bold tracking-wider"
            style={{ fontSize: 12, color: style.borderColor, opacity: stage.state === "pending" || stage.state === "no_data" ? 0.7 : 1 }}
          >
            {STAGE_LABELS[stage.id]}
          </span>
          {stage.summary && (
            <span className="text-[#E8EEF2] font-mono" style={{ fontSize: 11, marginTop: 2 }}>
              {stage.summary}
            </span>
          )}
          {stage.state === "no_data" && (
            <span style={{ fontSize: 9, color: "#7E93A6" }}>—</span>
          )}
        </div>

        {/* Arrow connector */}
        {!isLast && (
          <div className="flex items-center" style={{ width: 20 }}>
            <div className="h-px flex-1" style={{ backgroundColor: "#2A3949" }} />
            <svg width="8" height="8" viewBox="0 0 8 8" style={{ color: "#2A3949", flexShrink: 0 }}>
              <path d="M0 4h6M4 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        )}
      </div>

      {/* Satellites below */}
      {hasSatellites && (
        <div className="flex flex-col gap-1 mt-2" style={{ width: 80 }}>
          {stage.satellites.map((sat) => (
            <SatelliteChip key={sat.id} satellite={sat} calm={calm} />
          ))}
        </div>
      )}
    </div>
  );
}
