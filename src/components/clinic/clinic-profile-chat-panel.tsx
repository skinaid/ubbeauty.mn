"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ConfirmRequest = {
  field: string;
  value: string;
  display: string;
};

export function ClinicProfileChatPanel({
  orgId,
  onProfileUpdate,
}: {
  orgId: string;
  onProfileUpdate?: (fields: Record<string, unknown>) => void;
}) {
  void orgId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([{
      id: "init",
      role: "assistant",
      content: "Сайн байна уу! Би таны эмнэлгийн профайлыг бөглөхөд тусална. Эмнэлгийнхээ тухай юу ч хэлж болно — нэр, үйлчилгээ, байршил, утас... Эхлэцгээе! 🏥",
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingConfirm]);

  const doStream = useCallback(async (userMsg: Message, prevMessages: Message[]) => {
    setIsStreaming(true);
    setPendingConfirm(null);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const allMessages = [...prevMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/clinic/profile-agent", {
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
              fields?: Record<string, unknown>;
              field?: string;
              value?: string;
              display?: string;
            };
            if (event.type === "text" && event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content! } : m
                )
              );
            } else if (event.type === "confirm_request" && event.field && event.display) {
              setPendingConfirm({ field: event.field, value: event.value ?? "", display: event.display });
            } else if (event.type === "profile_updated" && event.fields && onProfileUpdate) {
              onProfileUpdate(event.fields);
            }
          } catch { /* skip */ }
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
  }, [onProfileUpdate]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    await doStream(userMsg, messages);
  }, [input, messages, isStreaming, doStream]);

  const handleConfirm = useCallback(async (confirmed: boolean) => {
    if (!pendingConfirm) return;
    const confirm = pendingConfirm;
    setPendingConfirm(null);

    const replyText = confirmed ? "✓ Тийм" : "Үгүй";
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: replyText };
    setMessages((prev) => [...prev, userMsg]);

    if (!confirmed) {
      const cancelMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "За, өөрчлүүлээрэй." };
      setMessages((prev) => [...prev, cancelMsg]);
      return;
    }

    setIsStreaming(true);
    const assistantId = (Date.now() + 2).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/clinic/profile-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          directSave: { [confirm.field]: confirm.value },
        }),
      });
      if (!res.ok || !res.body) throw new Error("Save failed");
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
            const event = JSON.parse(line.slice(6)) as { type: string; content?: string; fields?: Record<string, unknown> };
            if (event.type === "text" && event.content) {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.content! } : m));
            } else if (event.type === "profile_updated" && event.fields && onProfileUpdate) {
              onProfileUpdate(event.fields);
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Алдаа гарлаа." } : m));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [pendingConfirm, onProfileUpdate]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-base flex-shrink-0 shadow-sm">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
            AI Профайл Туслах
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
            Ярилцаж профайлаа хурдан бөглөөрэй
          </p>
        </div>
        {isStreaming && (
          <span className="text-xs text-indigo-400 animate-pulse flex-shrink-0">
            бичиж байна...
          </span>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] flex-shrink-0 mr-2 mt-1 self-start">
                ✦
              </div>
            )}
            <div
              className={`
                max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                ${msg.role === "user"
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl rounded-br-sm"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm border border-gray-100 dark:border-gray-700 shadow-sm"
                }
              `}
            >
              {msg.content || (isStreaming && msg.role === "assistant" ? (
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : "")}
            </div>
          </div>
        ))}

        {/* Confirm card */}
        {pendingConfirm && !isStreaming && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] flex-shrink-0 mr-2 mt-1 self-start">
              ✦
            </div>
            <div className="max-w-[78%] bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl rounded-bl-sm shadow-sm p-4 flex flex-col gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {pendingConfirm.display}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleConfirm(true)}
                  className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
                >
                  ✓ Тийм
                </button>
                <button
                  onClick={() => void handleConfirm(false)}
                  className="bg-transparent text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  Үгүй
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={isStreaming || !!pendingConfirm}
            placeholder={
              pendingConfirm
                ? "Дээрх баталгаажуулалтыг эхлээд шийднэ үү..."
                : "Эмнэлгийнхээ тухай хэлнэ үү..."
            }
            rows={1}
            className={`
              flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700
              bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              px-4 py-2.5 outline-none leading-relaxed
              focus:border-indigo-300 dark:focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40
              transition-colors
              ${(isStreaming || !!pendingConfirm) ? "opacity-50 cursor-not-allowed" : ""}
            `}
            style={{ fontFamily: "inherit" }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={isStreaming || !input.trim() || !!pendingConfirm}
            className={`
              flex-shrink-0 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
              text-sm font-semibold px-4 py-2.5 rounded-xl
              hover:bg-gray-700 dark:hover:bg-gray-200
              transition-colors
              ${(isStreaming || !input.trim() || !!pendingConfirm) ? "opacity-40 cursor-not-allowed" : ""}
            `}
          >
            {isStreaming ? (
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white dark:bg-gray-900 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-white dark:bg-gray-900 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-white dark:bg-gray-900 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : "Илгээх"}
          </button>
        </div>
        <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-2">
          Enter — илгээх · Shift+Enter — мөр эхлэх
        </p>
      </div>
    </div>
  );
}
