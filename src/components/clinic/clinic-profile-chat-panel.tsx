"use client";

export function ClinicProfileChatPanel({ orgId }: { orgId: string }) {
  void orgId; // will be used when AI chat is implemented
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "2rem",
        gap: "1rem",
      }}
    >
      <p
        style={{
          fontSize: "0.8rem",
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: 0,
        }}
      >
        AI Туслах
      </p>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>AI chat loading...</p>
      </div>
    </div>
  );
}
