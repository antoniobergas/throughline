import { openUrl } from "../electronApi";
import type { Satellite } from "../../../shared/types";

const KIND_ACCENT: Record<string, string> = {
  agent: "#38E1C6",
  subagent: "#1a8a7a",
  ai_review: "#8B7BF0",
  environment: "#6FD08C",
};

const STATUS_COLORS: Record<string, string> = {
  running: "#38E1C6",
  passed: "#6FD08C",
  failed: "#F2614E",
  waiting: "#F4A94B",
};

interface Props {
  satellite: Satellite;
}

export default function SatelliteChip({ satellite }: Props) {
  const accentColor = KIND_ACCENT[satellite.kind] ?? "#7E93A6";
  const dotColor = STATUS_COLORS[satellite.status] ?? "#7E93A6";
  const isRunning = satellite.status === "running";

  const handleClick = () => {
    if (satellite.url) openUrl(satellite.url);
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors max-w-[200px] ${satellite.url ? "cursor-pointer hover:bg-white/5" : "cursor-default"}`}
      style={{
        background: "#16212E",
        borderLeft: `3px solid ${accentColor}`,
        borderTop: "1px solid #2A3949",
        borderRight: "1px solid #2A3949",
        borderBottom: "1px solid #2A3949",
      }}
      onClick={handleClick}
      title={satellite.focus ?? satellite.label}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRunning ? "status-dot-running" : ""}`}
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-[#E8EEF2] truncate font-medium" style={{ fontSize: "11px" }}>
        {satellite.label}
      </span>
    </div>
  );
}
