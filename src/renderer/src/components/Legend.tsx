export default function Legend() {
  const items: { color: string; label: string; dim: boolean; faded?: boolean }[] = [
    { color: "#6FD08C", label: "done", dim: false },
    { color: "#38E1C6", label: "active", dim: false },
    { color: "#F2614E", label: "failed", dim: false },
    { color: "#2A3949", label: "pending", dim: false, faded: true },
    { color: "#2A3949", label: "no data", dim: true },
  ];

  const satellites = [
    { color: "#38E1C6", label: "agent" },
    { color: "#1a8a7a", label: "subagent" },
    { color: "#8B7BF0", label: "ai review" },
    { color: "#6FD08C", label: "environment" },
  ];

  return (
    <div
      className="flex items-center gap-6 px-4 py-2 border-t text-xs"
      style={{ background: "#16212E", borderColor: "#2A3949", color: "#7E93A6" }}
    >
      <span className="font-medium">Stage:</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5" style={{ opacity: item.dim ? 0.55 : 1 }}>
          <span
            className={`inline-block w-3 h-3 rounded-sm border ${item.label === "active" ? "animate-active-pulse" : ""}`}
            style={{
              borderColor: item.color,
              background: `${item.color}18`,
              borderStyle: item.dim ? "dashed" : "solid",
              opacity: item.faded ? 0.55 : 1,
              ...(item.label === "active" ? ({ '--pulse-color': '#38E1C6' } as React.CSSProperties) : {}),
            }}
          />
          {item.label}
        </span>
      ))}
      <span className="mx-2 opacity-30">|</span>
      <span className="font-medium">Satellite:</span>
      {satellites.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 rounded" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
