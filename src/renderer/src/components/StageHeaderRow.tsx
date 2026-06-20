export default function StageHeaderRow() {
  return (
    <div className="flex items-center px-3 pb-1 text-xs font-semibold tracking-wider" style={{ color: "#7E93A6" }}>
      {/* Zone labels */}
      <div
        className="flex-1 text-center py-0.5 rounded-sm mr-1"
        style={{ background: "rgba(56,225,198,0.05)", border: "1px solid rgba(56,225,198,0.1)", color: "#38E1C6", fontSize: 10 }}
      >
        AGENTS · BUILD
      </div>
      {/* Gate divider */}
      <div className="px-2" style={{ color: "#2A3949", fontSize: 10 }}>
        ╎ GATE ╎
      </div>
      <div
        className="flex-1 text-center py-0.5 rounded-sm ml-1"
        style={{ background: "rgba(111,208,140,0.05)", border: "1px solid rgba(111,208,140,0.1)", color: "#6FD08C", fontSize: 10 }}
      >
        INFRA · TO PROD
      </div>
    </div>
  );
}
