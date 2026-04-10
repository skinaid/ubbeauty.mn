"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type AvailabilityRule = { id: string; staff_member_id: string; location_id: string | null; weekday: number; start_local: string; end_local: string; is_available: boolean };
type StaffMember = { id: string; full_name: string; role: string };
type ClinicLocation = { id: string; name: string };
type Message = { id: string; role: "user" | "assistant"; content: string };
type ConfirmRequest = { display: string; ruleData: Record<string, unknown> };

export function AvailabilityChatPanel({ orgId, staffMembers, locations, onRuleAdd }: {
  orgId: string; staffMembers: StaffMember[]; locations: ClinicLocation[]; onRuleAdd: (r: AvailabilityRule) => void;
}) {
  void orgId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const staffList = staffMembers.map((s) => s.full_name).join(", ");
    setMessages([{ id: "init", role: "assistant", content: staffMembers.length === 0 ? "Ажилтан бүртгэлгүй байна. Эхлээд ажилтан нэмнэ үү." : `Сайн байна уу! Ажилтнуудын ажлын цагийг тохируулцгааё.\n\nАжилтнууд: ${staffList}\n\nХэний ажлын цагийг тохируулах вэ?` }]);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pendingConfirm]);

  const doStream = useCallback(async (userMsg: Message, prevMessages: Message[]) => {
    setIsStreaming(true); setPendingConfirm(null);
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/clinic/availability-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...prevMessages, userMsg].map((m) => ({ role: m.role, content: m.content })), staffMembers, locations }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; content?: string; display?: string; ruleData?: Record<string, unknown>; rule?: AvailabilityRule };
            if (event.type === "text" && event.content) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.content! } : m));
            else if (event.type === "confirm_rule" && event.display && event.ruleData) setPendingConfirm({ display: event.display, ruleData: event.ruleData });
            else if (event.type === "rule_saved" && event.rule) onRuleAdd(event.rule);
          } catch { /* skip */ }
        }
      }
    } catch { setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Алдаа гарлаа." } : m)); }
    finally { setIsStreaming(false); inputRef.current?.focus(); }
  }, [staffMembers, locations, onRuleAdd]);

  const sendMessage = useCallback(async () => {
    const text = input.trim(); if (!text || isStreaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]); setInput("");
    await doStream(userMsg, messages);
  }, [input, messages, isStreaming, doStream]);

  const handleConfirm = useCallback(async (confirmed: boolean) => {
    if (!pendingConfirm) return;
    const confirm = pendingConfirm; setPendingConfirm(null);
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: confirmed ? "✓ Тийм" : "Үгүй" };
    setMessages((prev) => [...prev, userMsg]);
    if (!confirmed) { setMessages((prev) => [...prev, { id: (Date.now()+1).toString(), role: "assistant", content: "За, өөрчлүүлээрэй." }]); return; }
    setIsStreaming(true);
    const assistantId = (Date.now() + 2).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/clinic/availability-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directSave: confirm.ruleData }),
      });
      if (!res.ok || !res.body) throw new Error("Save failed");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; content?: string; rule?: AvailabilityRule };
            if (event.type === "text" && event.content) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.content! } : m));
            else if (event.type === "rule_saved" && event.rule) onRuleAdd(event.rule);
          } catch { /* skip */ }
        }
      }
    } catch { setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Алдаа гарлаа." } : m)); }
    finally { setIsStreaming(false); inputRef.current?.focus(); }
  }, [pendingConfirm, onRuleAdd]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafafa" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
        <p style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>AI Цаг тохируулагч</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "0.75rem 1rem", borderRadius: msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem", background: msg.role === "user" ? "#111827" : "#ffffff", color: msg.role === "user" ? "#ffffff" : "#111827", fontSize: "0.9rem", lineHeight: "1.5", border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none", whiteSpace: "pre-wrap" }}>
              {msg.content || (isStreaming && msg.role === "assistant" ? <span style={{ color: "#9ca3af" }}>▋</span> : "")}
            </div>
          </div>
        ))}
        {pendingConfirm && !isStreaming && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "1rem", padding: "1rem 1.25rem", maxWidth: "85%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{pendingConfirm.display}</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => void handleConfirm(true)} style={{ background: "#111827", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>✓ Тийм</button>
              <button onClick={() => void handleConfirm(false)} style={{ background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.5rem 1.25rem", fontSize: "0.85rem", cursor: "pointer" }}>Үгүй</button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e7eb", background: "#ffffff" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={isStreaming || !!pendingConfirm} placeholder={pendingConfirm ? "Баталгаажуулалтыг эхлээд шийднэ үү..." : "Жнь: Болд Даваа-Баасан 09:00-18:00 ажиллана"} rows={2}
            style={{ flex: 1, resize: "none", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.75rem 1rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", lineHeight: "1.5", opacity: pendingConfirm ? 0.5 : 1 }} />
          <button onClick={() => void sendMessage()} disabled={isStreaming || !input.trim() || !!pendingConfirm}
            style={{ background: "#111827", color: "#fff", border: "none", borderRadius: "0.75rem", padding: "0.75rem 1.25rem", fontSize: "0.9rem", fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", opacity: isStreaming || !input.trim() || pendingConfirm ? 0.5 : 1 }}>
            {isStreaming ? "..." : "Илгээх"}
          </button>
        </div>
        <p style={{ fontSize: "0.7rem", color: "#9ca3af", margin: "0.5rem 0 0" }}>Enter — илгээх · Shift+Enter — мөр эхлэх</p>
      </div>
    </div>
  );
}
