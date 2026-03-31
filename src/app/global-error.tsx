"use client";

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center"
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem", maxWidth: 480 }}>
            An unexpected error occurred. Please try again, or contact support if the problem persists.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.25rem",
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
      </body>
    </html>
  );
}
