"use client";

export default function OpsError({
  error,
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
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Internal ops error</h2>
      <p style={{ color: "#64748b", marginBottom: "0.5rem" }}>
        An error occurred while loading this page.
      </p>
      <pre
        style={{
          background: "#f1f5f9",
          padding: "0.75rem 1rem",
          borderRadius: "0.375rem",
          fontSize: "0.75rem",
          color: "#dc2626",
          maxWidth: 600,
          margin: "0 auto 1.5rem",
          overflow: "auto",
          textAlign: "left"
        }}
      >
        {error.digest ?? error.message}
      </pre>
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
        Retry
      </button>
    </div>
  );
}
