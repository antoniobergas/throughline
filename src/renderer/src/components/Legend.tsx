import { useState } from "react";

const STAGE_ITEMS = [
  { color: "#4ADE80", label: "done", borderStyle: "solid" as const },
  { color: "#38E1C6", label: "active", borderStyle: "solid" as const, pulse: true },
  { color: "#F2614E", label: "failed", borderStyle: "solid" as const },
  { color: "#1E2D3D", label: "pending", borderStyle: "solid" as const, dim: true },
  { color: "#1E2D3D", label: "no data", borderStyle: "dashed" as const, dim: true },
];

const SAT_ITEMS = [
  { color: "#38E1C6", label: "agent" },
  { color: "#1a8a7a", label: "subagent" },
  { color: "#8B7BF0", label: "ai review" },
  { color: "#4ADE80", label: "environment" },
];

export default function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="flex items-center justify-center rounded-full text-xs font-semibold transition-colors hover:bg-white/5"
        style={{
          width: 20,
          height: 20,
          border: "1px solid #2A3949",
          color: "#5A7389",
          fontSize: 11,
        }}
        onClick={() => setOpen((v) => !v)}
        title="Legend"
        aria-label="Show legend"
      >
        ?
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Popover */}
          <div
            className="absolute bottom-full mb-2 right-0 rounded-xl p-3 z-50 shadow-2xl"
            style={{
              background: "#0D1825",
              border: "1px solid #1E2D3D",
              minWidth: 240,
            }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "#8CA8BE", letterSpacing: "0.06em" }}>
              STAGE STATE
            </p>
            <div className="flex flex-col gap-1.5 mb-3">
              {STAGE_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2" style={{ opacity: item.dim ? 0.55 : 1 }}>
                  <span
                    className={`w-8 h-4 rounded-sm flex-shrink-0 ${item.pulse ? "animate-active-pulse" : ""}`}
                    style={{
                      border: `1.5px ${item.borderStyle} ${item.color}`,
                      background: `${item.color}0A`,
                      ...(item.pulse ? ({ "--pulse-color": item.color } as React.CSSProperties) : {}),
                    }}
                  />
                  <span className="text-xs" style={{ color: "#8CA8BE" }}>{item.label}</span>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold mb-2" style={{ color: "#8CA8BE", letterSpacing: "0.06em" }}>
              SATELLITE
            </p>
            <div className="flex flex-col gap-1.5">
              {SAT_ITEMS.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-0.5 h-4 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs" style={{ color: "#8CA8BE" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
