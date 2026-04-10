"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function PatientsChatPanel({ orgId }: { orgId: string }) {
  void orgId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "init",
        role: "assistant",
        content:
          "Сайн байна уу! Би таны үйлчлүүлэгчийн мэдээлэлтэй ажиллахад тусална. Үйлчлүүлэгч хайх, мэдээлэл шинэчлэх, follow-up тохируулах зэрэг зүйлсийг хийж чадна. ✨",
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const doStream = useCallback(async (userMsg: Message, prevMessages: Message[]) => {
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const allMessages = [...prevMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/patients/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              content?: string;
            };
            if (event.type === "text" && event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content! } : m
                )
              );
            }
          } catch {
            /* skip malformed events */
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Алдаа гарлаа. Дахин оролдоно уу." } : m
        )
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    await doStream(userMsg, messages);
  }, [input, messages, isStreaming, doStream]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafafa" }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1rem 1.25rem",
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
      }}>
        <div style={{
          width: "2.25rem", height: "2.25rem", borderRadius: "0.6rem", flexShrink: 0,
          background: "linear-gradient(135deg, #34d399, #059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: "1rem",
        }}>
          👤
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>
            AI Үйлчлүүлэгч Туслах
          </p>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>
            Үйлчлүүлэгчийн мэдээлэл, follow-up, CRM
          </p>
        </div>
        {isStreaming && (
          <span style={{ fontSize: "0.7rem", color: "#34d399", flexShrink: 0 }}>бичиж байна...</span>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "1.25rem 1rem",
        display: "flex", flexDirection: "column", gap: "0.75rem",
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            {msg.role === "assistant" && (
              <div style={{
                width: "1.5rem", height: "1.5rem", borderRadius: "0.4rem", flexShrink: 0,
                background: "linear-gradient(135deg, #34d399, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "0.65rem", marginTop: "0.1rem",
              }}>
                👤
              </div>
            )}
            <div style={{
              maxWidth: "78%",
              padding: "0.6rem 0.9rem",
              borderRadius: msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
              background: msg.role === "user" ? "#111827" : "#ffffff",
              color: msg.role === "user" ? "#ffffff" : "#111827",
              fontSize: "0.875rem",
              lineHeight: "1.5",
              border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none",
              whiteSpace: "pre-wrap",
            }}>
              {msg.content || (isStreaming && msg.role === "assistant"
                ? <span style={{ color: "#9ca3af" }}>▋</span>
                : ""
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: "0.75rem 1rem",
        borderTop: "1px solid #e5e7eb", background: "#ffffff",
      }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={isStreaming}
            placeholder="Үйлчлүүлэгчийн тухай асуух зүйлсээ бичнэ үү..."
            rows={1}
            style={{
              flex: 1, resize: "none",
              border: "1px solid #e5e7eb", borderRadius: "0.65rem",
              padding: "0.6rem 0.85rem",
              fontSize: "0.875rem", outline: "none", fontFamily: "inherit",
              lineHeight: "1.5", background: "#f9fafb",
              opacity: isStreaming ? 0.5 : 1,
              color: "#111827",
            }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={isStreaming || !input.trim()}
            style={{
              background: "#111827", color: "#ffffff", border: "none",
              borderRadius: "0.65rem", padding: "0.6rem 1rem",
              fontSize: "0.875rem", fontWeight: 600,
              cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
              opacity: isStreaming || !input.trim() ? 0.4 : 1,
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {isStreaming ? "..." : "Илгээх"}
          </button>
        </div>
        <p style={{ fontSize: "0.65rem", color: "#d1d5db", margin: "0.4rem 0 0" }}>
          Enter — илгээх · Shift+Enter — мөр эхлэх
        </p>
      </div>
    </div>
  );
}
