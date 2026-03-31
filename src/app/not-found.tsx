import Link from "next/link";

export default function NotFound() {
  return (
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
      <h1 style={{ fontSize: "4rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>404</h1>
      <p style={{ fontSize: "1.125rem", color: "#64748b", marginBottom: "1.5rem" }}>
        This page could not be found.
      </p>
      <Link
        href="/dashboard"
        style={{
          padding: "0.625rem 1.25rem",
          background: "#0f172a",
          color: "#fff",
          borderRadius: "0.375rem",
          textDecoration: "none",
          fontSize: "0.875rem"
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
