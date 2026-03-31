"use client";

export default function DashboardError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        padding: "3rem 2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h2>
      <p style={{ color: "#64748b", marginBottom: "1.5rem", maxWidth: 480, margin: "0 auto 1.5rem" }}>
        We couldn&apos;t load this page. This may be a temporary issue — please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          background: "#0f172a",
          color: "#fff",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontSize: "0.875rem"
        }}
      >
        Try again
      </button>
    </div>
  );
}
