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
  topAccent: string | null;
  background: string;
  opacity: number;
  borderStyle: string;
}

function getBoxStyle(state: Stage["state"]): BoxStyleProps {
  switch (state) {
    case "done":
      return {
        borderColor: "#4ADE80",
        topAccent: "rgba(74,222,128,0.6)",
        background: "rgba(74,222,128,0.04)",
        opacity: 1,
        borderStyle: "solid",
      };
    case "active":
      return {
        borderColor: "#38E1C6",
        topAccent: null,
        background: "rgba(56,225,198,0.06)",
        opacity: 1,
        borderStyle: "solid",
      };
    case "failed":
      return {
        borderColor: "#F2614E",
        topAccent: null,
        background: "rgba(242,97,78,0.07)",
        opacity: 1,
        borderStyle: "solid",
      };
    case "pending":
      return {
        borderColor: "#1E2D3D",
        topAccent: null,
        background: "transparent",
        opacity: 0.6,
        borderStyle: "solid",
      };
    case "no_data":
      return {
        borderColor: "#1E2D3D",
        topAccent: null,
        background: "transparent",
        opacity: 0.35,
        borderStyle: "dashed",
      };
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
          aria-label={`${STAGE_LABELS[stage.id]} — ${stage.state}`}
          className={`relative flex flex-col items-center justify-center rounded select-none transition-all
            ${hasUrl ? "cursor-pointer hover:brightness-110 hover:ring-1 hover:ring-white/10" : "cursor-default"}
            ${isActive && !calm ? "animate-active-pulse" : ""}
          `}
          style={{
            width: 76,
            minHeight: 50,
            border: `1.5px ${style.borderStyle} ${style.borderColor}`,
            borderTopColor: style.topAccent ?? style.borderColor,
            borderTopWidth: style.topAccent ? 2 : 1.5,
            background: style.background,
            opacity: style.opacity,
            boxShadow: isActive && !calm ? `0 0 10px ${style.borderColor}35` : undefined,
            ...(isActive && !calm
              ? ({ "--pulse-color": style.borderColor } as React.CSSProperties)
              : {}),
          }}
          onClick={hasUrl ? handleClick : undefined}
          onKeyDown={
            hasUrl
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") handleClick();
                }
              : undefined
          }
          title={titleAttr}
        >
          <span
            className="font-semibold tracking-widest uppercase"
            style={{
              fontSize: 9,
              color: style.borderColor,
              letterSpacing: "0.1em",
              opacity: style.opacity < 1 ? 0.8 : 1,
            }}
          >
            {STAGE_LABELS[stage.id]}
          </span>
          {stage.summary && (
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 11, color: "#CDD6DF", marginTop: 1 }}
            >
              {stage.summary}
            </span>
          )}
        </div>

        {/* Arrow connector */}
        {!isLast && (
          <div className="flex items-center" style={{ width: 18 }}>
            <div style={{ height: 1, flex: 1, backgroundColor: "#2E4257" }} />
            <svg
              width="7"
              height="7"
              viewBox="0 0 7 7"
              fill="none"
              style={{ color: "#2E4257", flexShrink: 0 }}
            >
              <path
                d="M0 3.5h5M3 1.5l2 2-2 2"
                stroke="currentColor"
                strokeWidth="1.3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Satellites below */}
      {hasSatellites && (
        <div className="flex flex-col gap-1 mt-2" style={{ width: 76 }}>
          {stage.satellites.map((sat) => (
            <SatelliteChip key={sat.id} satellite={sat} calm={calm} />
          ))}
        </div>
      )}
    </div>
  );
}
