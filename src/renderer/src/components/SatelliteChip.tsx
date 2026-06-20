import { openUrl } from "../electronApi";
import type { Satellite } from "../../../shared/types";

const KIND_ACCENT: Record<string, string> = {
  agent: "#38E1C6",
  subagent: "#1a8a7a",
  ai_review: "#8B7BF0",
  environment: "#4ADE80",
};

const STATUS_COLORS: Record<string, string> = {
  running: "#38E1C6",
  passed: "#4ADE80",
  failed: "#F2614E",
  waiting: "#F4A94B",
};

interface Props {
  satellite: Satellite;
  calm?: boolean;
}

export default function SatelliteChip({ satellite, calm }: Props) {
  const accentColor = KIND_ACCENT[satellite.kind] ?? "#7E93A6";
  const dotColor = STATUS_COLORS[satellite.status] ?? "#7E93A6";
  const isRunning = satellite.status === "running";

  const handleClick = () => {
    if (satellite.url) openUrl(satellite.url);
  };

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors max-w-[160px] ${satellite.url ? "cursor-pointer hover:bg-white/5" : "cursor-default"}`}
      style={{
        background: "#080E14",
        borderTop: "1px solid #1E2D3D",
        borderRight: "1px solid #1E2D3D",
        borderBottom: "1px solid #1E2D3D",
        borderLeft: `2px solid ${accentColor}`,
      }}
      onClick={handleClick}
      title={satellite.focus ?? satellite.label}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRunning && !calm ? "status-dot-running" : ""}`}
        style={{ backgroundColor: dotColor }}
      />
      <span className="truncate" style={{ fontSize: 11, color: "#8CA8BE" }}>
        {satellite.label}
      </span>
    </div>
  );
}
