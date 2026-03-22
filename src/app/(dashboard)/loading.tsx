export default function DashboardLoading() {
  return (
    <div
      style={{
        padding: "3rem 2rem",
        textAlign: "center",
        color: "#94a3b8",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <div
        style={{
          display: "inline-block",
          width: "1.5rem",
          height: "1.5rem",
          border: "2px solid #e2e8f0",
          borderTopColor: "#0f172a",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite"
        }}
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>Loading…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
