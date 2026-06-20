export default function StageHeaderRow() {
  return (
    <div
      className="flex items-center px-4 pb-1.5"
      style={{ paddingLeft: "calc(4px + 4px + 12px)" }}
    >
      {/* Left zone: WORK + PR + CHECKS + REVIEW = 4×80px boxes + 3×20px arrows = 380px */}
      <div
        className="flex items-center justify-center rounded-sm"
        style={{
          width: 380,
          height: 20,
          background: "rgba(56,225,198,0.04)",
          border: "1px solid rgba(56,225,198,0.1)",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "rgba(56,225,198,0.5)",
            textTransform: "uppercase",
          }}
        >
          Build
        </span>
      </div>

      {/* Gate gap */}
      <div style={{ width: 28 }} />

      {/* Right zone: MERGE + DEPLOY + PROD = 3×80px boxes + 2×20px arrows = 280px */}
      <div
        className="flex items-center justify-center rounded-sm"
        style={{
          width: 280,
          height: 20,
          background: "rgba(111,208,140,0.04)",
          border: "1px solid rgba(111,208,140,0.1)",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "rgba(111,208,140,0.5)",
            textTransform: "uppercase",
          }}
        >
          Ship
        </span>
      </div>
    </div>
  );
}
