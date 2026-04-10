"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Service = {
  id: string; name: string; description: string | null;
  duration_minutes: number; price_from: number; currency: string;
  is_bookable: boolean; status: string; location_id: string | null; category_id: string | null;
};
type Message = { id: string; role: "user" | "assistant"; content: string };
type ConfirmSave = { kind: "save"; display: string; serviceData: Partial<Service> & { id?: string } };
type ConfirmDelete = { kind: "delete"; display: string; serviceId: string; serviceName: string };
type PendingConfirm = ConfirmSave | ConfirmDelete;

type ParsedService = {
  name: string;
  price_from: number;
  duration_minutes: number;
  description: string;
  is_bookable: boolean;
};

type ParsedCategory = {
  name: string;
  services: ParsedService[];
};

// ─── BatchConfirmPanel ────────────────────────────────────────────────────────

function BatchConfirmPanel({
  categories,
  onConfirm,
  onCancel,
  isSaving,
}: {
  categories: ParsedCategory[];
  onConfirm: (selected: Array<ParsedService & { category_name: string }>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  // Build initial checked state: { "categoryName|||serviceName": true }
  const buildKey = (cat: string, svc: string) => `${cat}|||${svc}`;
  const initialChecked: Record<string, boolean> = {};
  for (const cat of categories) {
    for (const svc of cat.services) {
      initialChecked[buildKey(cat.name, svc.name)] = true;
    }
  }
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked);

  const toggleCategory = (catName: string, services: ParsedService[]) => {
    const keys = services.map((s) => buildKey(catName, s.name));
    const allChecked = keys.every((k) => checked[k]);
    setChecked((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = !allChecked;
      return next;
    });
  };

  const toggleService = (catName: string, svcName: string) => {
    const key = buildKey(catName, svcName);
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = Object.values(checked).filter(Boolean).length;

  const handleConfirm = () => {
    const selected: Array<ParsedService & { category_name: string }> = [];
    for (const cat of categories) {
      for (const svc of cat.services) {
        if (checked[buildKey(cat.name, svc.name)]) {
          selected.push({ ...svc, category_name: cat.name });
        }
      }
    }
    onConfirm(selected);
  };

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "1rem",
      overflow: "hidden",
      maxHeight: "60vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#111827" }}>
          📋 Файлаас олдсон үйлчилгээнүүд
        </p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#6b7280" }}>
          Нэмэх үйлчилгээнүүдийг сонгоно уу
        </p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {categories.map((cat) => {
          const catKeys = cat.services.map((s) => buildKey(cat.name, s.name));
          const allCatChecked = catKeys.every((k) => checked[k]);
          return (
            <div key={cat.name}>
              {/* Category header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "#f3f4f6",
                cursor: "pointer",
              }}
                onClick={() => toggleCategory(cat.name, cat.services)}
              >
                <input
                  type="checkbox"
                  checked={allCatChecked}
                  onChange={() => toggleCategory(cat.name, cat.services)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: "pointer", accentColor: "#111827" }}
                />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {cat.name}
                </span>
                <span style={{ fontSize: "0.7rem", color: "#9ca3af", marginLeft: "auto" }}>
                  {cat.services.length} үйлчилгээ
                </span>
              </div>
              {/* Services */}
              {cat.services.map((svc) => {
                const key = buildKey(cat.name, svc.name);
                return (
                  <div key={key} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem 1rem 0.5rem 1.75rem",
                    borderBottom: "1px solid #f9fafb",
                    opacity: checked[key] ? 1 : 0.45,
                    cursor: "pointer",
                  }}
                    onClick={() => toggleService(cat.name, svc.name)}
                  >
                    <input
                      type="checkbox"
                      checked={checked[key] ?? false}
                      onChange={() => toggleService(cat.name, svc.name)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer", accentColor: "#111827", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#111827", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {svc.name}
                      </p>
                      {svc.description && (
                        <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {svc.description}
                        </p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "#111827" }}>
                        ₮{Number(svc.price_from).toLocaleString()}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af" }}>
                        {svc.duration_minutes}мин
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e5e7eb", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          onClick={handleConfirm}
          disabled={isSaving || selectedCount === 0}
          style={{
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: isSaving || selectedCount === 0 ? "not-allowed" : "pointer",
            opacity: isSaving || selectedCount === 0 ? 0.5 : 1,
          }}
        >
          {isSaving ? "Хадгалж байна..." : `${selectedCount} үйлчилгээ нэмэх`}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          style={{
            background: "transparent",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Болих
        </button>
      </div>
    </div>
  );
}

// ─── ServicesChatPanel ────────────────────────────────────────────────────────

export function ServicesChatPanel({ orgId, services, onServiceUpdate, onServiceDelete }: {
  orgId: string;
  services: Service[];
  onServiceUpdate: (s: Service) => void;
  onServiceDelete?: (id: string) => void;
}) {
  void orgId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  // File upload state
  const [parsedCategories, setParsedCategories] = useState<ParsedCategory[] | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([{ id: "init", role: "assistant", content: services.length === 0
      ? "Сайн байна уу! Үйлчилгээ нэмэх эсвэл устгах боломжтой. Нэр, хугацаа, үнийг хэлнэ үү 💆\n\n📎 Үнийн жагсаалт файлаа (PDF, Excel, зураг) upload хийж болно."
      : `Одоо ${services.length} үйлчилгээ бүртгэлтэй. Нэмэх эсвэл устгах боломжтой.\n\n📎 Файлаас bulk import хийхдээ цааш дарна уу.` }]);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pendingConfirm, parsedCategories]);

  // ── File upload handler ──
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) fileInputRef.current = e.target;
    e.target.value = ""; // reset so same file can be re-selected
    if (!file) return;

    setParsedCategories(null);
    setIsParsingFile(true);
    const uploadMsg: Message = { id: Date.now().toString(), role: "user", content: `📎 Файл: ${file.name}` };
    setMessages((prev) => [...prev, uploadMsg]);
    const processingMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "Файл боловсруулж байна..." };
    setMessages((prev) => [...prev, processingMsg]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/clinic/services/parse-menu", {
        method: "POST",
        body: formData,
      });
      const json = await res.json() as { categories?: ParsedCategory[]; error?: string };

      if (!res.ok || json.error) {
        setMessages((prev) => prev.map((m) =>
          m.id === processingMsg.id
            ? { ...m, content: `❌ Алдаа: ${json.error ?? "Файл уншихад алдаа гарлаа"}` }
            : m
        ));
        return;
      }

      const cats = json.categories ?? [];
      const totalServices = cats.reduce((acc, c) => acc + c.services.length, 0);

      if (totalServices === 0) {
        setMessages((prev) => prev.map((m) =>
          m.id === processingMsg.id
            ? { ...m, content: "Файлаас үйлчилгээ олдсонгүй. Өөр файл оролдоно уу." }
            : m
        ));
        return;
      }

      setMessages((prev) => prev.map((m) =>
        m.id === processingMsg.id
          ? { ...m, content: `✓ ${cats.length} ангилал, нийт ${totalServices} үйлчилгээ олдлоо. Нэмэх үйлчилгээнүүдийг сонгоно уу:` }
          : m
      ));
      setParsedCategories(cats);
    } catch (err) {
      setMessages((prev) => prev.map((m) =>
        m.id === processingMsg.id
          ? { ...m, content: `❌ Алдаа: ${err instanceof Error ? err.message : "Network error"}` }
          : m
      ));
    } finally {
      setIsParsingFile(false);
    }
  }, []);

  const handleBatchConfirm = useCallback(async (selected: Array<ParsedService & { category_name: string }>) => {
    setIsBatchSaving(true);
    try {
      const res = await fetch("/api/clinic/services/batch-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: selected }),
      });
      const json = await res.json() as { saved?: number; categories?: number; services?: Service[]; error?: string };

      if (!res.ok || json.error) {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(), role: "assistant",
          content: `❌ Хадгалах үед алдаа гарлаа: ${json.error ?? "Unknown error"}`,
        }]);
        return;
      }

      const savedServices = json.services ?? [];
      for (const svc of savedServices) {
        onServiceUpdate(svc);
      }

      setMessages((prev) => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: `✓ ${json.saved} үйлчилгээ, ${json.categories} ангилал амжилттай нэмэгдлээ! 🎉`,
      }]);
      setParsedCategories(null);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: `❌ Алдаа: ${err instanceof Error ? err.message : "Network error"}`,
      }]);
    } finally {
      setIsBatchSaving(false);
    }
  }, [onServiceUpdate]);

  const handleBatchCancel = useCallback(() => {
    setParsedCategories(null);
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Болиулагдлаа." }]);
  }, []);

  // ── AI chat ──
  const doStream = useCallback(async (userMsg: Message, prevMessages: Message[]) => {
    setIsStreaming(true); setPendingConfirm(null);
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/clinic/services-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...prevMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          existingServices: services,
        }),
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
            const event = JSON.parse(line.slice(6)) as {
              type: string; content?: string;
              display?: string;
              serviceData?: Partial<Service> & { id?: string };
              service?: Service;
              serviceId?: string;
              serviceName?: string;
            };
            if (event.type === "text" && event.content)
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.content! } : m));
            else if (event.type === "confirm_service" && event.display && event.serviceData)
              setPendingConfirm({ kind: "save", display: event.display, serviceData: event.serviceData });
            else if (event.type === "confirm_delete" && event.display && event.serviceId)
              setPendingConfirm({ kind: "delete", display: event.display, serviceId: event.serviceId, serviceName: event.serviceName ?? "" });
            else if (event.type === "service_saved" && event.service)
              onServiceUpdate(event.service);
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Алдаа гарлаа." } : m));
    } finally { setIsStreaming(false); inputRef.current?.focus(); }
  }, [services, onServiceUpdate]);

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
    if (!confirmed) {
      setMessages((prev) => [...prev, { id: (Date.now()+1).toString(), role: "assistant", content: "За, болиулья." }]);
      return;
    }

    setIsStreaming(true);
    const assistantId = (Date.now() + 2).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const body = confirm.kind === "delete"
        ? { directDelete: { serviceId: confirm.serviceId } }
        : { directSave: confirm.serviceData };

      const res = await fetch("/api/clinic/services-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string; content?: string; service?: Service; serviceId?: string;
            };
            if (event.type === "text" && event.content)
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.content! } : m));
            else if (event.type === "service_saved" && event.service)
              onServiceUpdate(event.service);
            else if (event.type === "service_deleted" && event.serviceId && onServiceDelete)
              onServiceDelete(event.serviceId);
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Алдаа гарлаа." } : m));
    } finally { setIsStreaming(false); inputRef.current?.focus(); }
  }, [pendingConfirm, onServiceUpdate, onServiceDelete]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  const isDeleteConfirm = pendingConfirm?.kind === "delete";
  const isInputDisabled = isStreaming || !!pendingConfirm || isParsingFile || !!parsedCategories;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafafa" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
        <p style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          AI Үйлчилгээ туслах
        </p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "0.75rem 1rem",
              borderRadius: msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
              background: msg.role === "user" ? "#111827" : "#ffffff",
              color: msg.role === "user" ? "#ffffff" : "#111827",
              fontSize: "0.9rem", lineHeight: "1.5",
              border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none",
              whiteSpace: "pre-wrap",
            }}>
              {msg.content || (isStreaming && msg.role === "assistant" ? <span style={{ color: "#9ca3af" }}>▋</span> : "")}
            </div>
          </div>
        ))}

        {/* BatchConfirmPanel shown after file parse */}
        {parsedCategories && !isParsingFile && (
          <BatchConfirmPanel
            categories={parsedCategories}
            onConfirm={(selected) => void handleBatchConfirm(selected)}
            onCancel={handleBatchCancel}
            isSaving={isBatchSaving}
          />
        )}

        {pendingConfirm && !isStreaming && (
          <div style={{
            background: "#fff",
            border: `1px solid ${isDeleteConfirm ? "#fecaca" : "#e5e7eb"}`,
            borderRadius: "1rem", padding: "1rem 1.25rem",
            maxWidth: "85%", display: "flex", flexDirection: "column", gap: "0.75rem",
          }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {pendingConfirm.display}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => void handleConfirm(true)}
                style={{
                  background: isDeleteConfirm ? "#ef4444" : "#111827",
                  color: "#fff", border: "none", borderRadius: "0.5rem",
                  padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                {isDeleteConfirm ? "🗑 Устгах" : "✓ Тийм"}
              </button>
              <button
                onClick={() => void handleConfirm(false)}
                style={{
                  background: "transparent", color: "#6b7280",
                  border: "1px solid #e5e7eb", borderRadius: "0.5rem",
                  padding: "0.5rem 1.25rem", fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                Болих
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e7eb", background: "#ffffff" }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
          style={{ display: "none" }}
          onChange={(e) => void handleFileChange(e)}
        />
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          {/* 📎 file upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isInputDisabled}
            title="Файлаас import хийх (PDF, Excel, зураг)"
            style={{
              background: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: "0.75rem",
              padding: "0.75rem",
              cursor: isInputDisabled ? "not-allowed" : "pointer",
              fontSize: "1.1rem",
              opacity: isInputDisabled ? 0.4 : 1,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {isParsingFile ? "⏳" : "📎"}
          </button>
          <textarea
            ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={isInputDisabled}
            placeholder={
              parsedCategories ? "Файлаас import хийхийн өмнө шийдвэрлэнэ үү..." :
              pendingConfirm ? "Баталгаажуулалтыг эхлээд шийднэ үү..." :
              "Үйлчилгээ нэмэх эсвэл устгахыг хэлнэ үү..."
            }
            rows={2}
            style={{
              flex: 1, resize: "none", border: "1px solid #e5e7eb", borderRadius: "0.75rem",
              padding: "0.75rem 1rem", fontSize: "0.9rem", outline: "none",
              fontFamily: "inherit", lineHeight: "1.5", opacity: isInputDisabled ? 0.5 : 1,
            }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={isStreaming || !input.trim() || isInputDisabled}
            style={{
              background: "#111827", color: "#fff", border: "none",
              borderRadius: "0.75rem", padding: "0.75rem 1.25rem",
              fontSize: "0.9rem", fontWeight: 600, whiteSpace: "nowrap",
              cursor: "pointer", opacity: isStreaming || !input.trim() || isInputDisabled ? 0.5 : 1,
            }}
          >
            {isStreaming ? "..." : "Илгээх"}
          </button>
        </div>
        <p style={{ fontSize: "0.7rem", color: "#9ca3af", margin: "0.5rem 0 0" }}>
          Enter — илгээх · Shift+Enter — мөр эхлэх · 📎 — файлаас import
        </p>
      </div>
    </div>
  );
}
