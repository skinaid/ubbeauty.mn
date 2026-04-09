import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROLE_LABELS: Record<string, string> = {
  owner: "Эзэмшигч",
  manager: "Менежер",
  front_desk: "Хүлээн авагч",
  provider: "Мэргэжилтэн",
  assistant: "Туслах",
  billing: "Тооцоо",
};

const SYSTEM_PROMPT = `Та эмнэлгийн ажилтнуудыг бүртгэх AI туслах мөн.

## 2 АЛХАМТ FLOW
Алхам 1: Хэрэглэгч мэдээлэл өгнө → confirm_staff tool дуудах
Алхам 2: Хэрэглэгч "Тийм" гэвэл → хадгалагдана

## Цуглуулах мэдээлэл
- full_name: ажилтны бүтэн нэр (заавал)
- role: үүрэг — provider/manager/front_desk/assistant/billing/owner (заавал)
- specialty: мэргэжил (жнь: Арьс судлаач, Гоо засалч)
- bio: товч танилцуулга
- phone: утас
- email: и-мэйл
- accepts_online_booking: онлайн захиалга хүлээн авах эсэх (true/false)

## Role тодорхойлолт
- provider → Мэргэжилтэн (эмч, гоо засалч)
- manager → Менежер
- front_desk → Хүлээн авагч
- assistant → Туслах
- billing → Тооцоо
- owner → Эзэмшигч

## Дэг журам
1. Нэр + үүрэг авмагц confirm_staff дуудах
2. Нэмэлт мэдээлэл (утас, мэргэжил) байвал мөн оруулах
3. display текстэд нэр, үүрэг, бусад мэдээллийг харуулах
4. Монгол хэлний эелдэг өнгө аялга
5. Нэг ажилтан дуусмагц "Өөр ажилтан нэмэх үү?" гэж асуух`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "confirm_staff",
      description: "Ажилтны мэдээллийг баталгаажуулахаар хэрэглэгчид харуулах",
      parameters: {
        type: "object",
        properties: {
          staffData: {
            type: "object",
            properties: {
              id: { type: "string" },
              full_name: { type: "string" },
              role: {
                type: "string",
                enum: ["owner", "manager", "front_desk", "provider", "assistant", "billing"],
              },
              specialty: { type: "string" },
              bio: { type: "string" },
              phone: { type: "string" },
              email: { type: "string" },
              accepts_online_booking: { type: "boolean" },
            },
            required: ["full_name", "role"],
          },
          display: { type: "string" },
        },
        required: ["staffData", "display"],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const org = await getCurrentUserOrganization(user.id);
  if (!org) return new Response("No organization", { status: 400 });

  const body = (await req.json()) as {
    messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    existingStaff?: unknown[];
    directSave?: Record<string, unknown> & { id?: string };
  };
  const encoder = new TextEncoder();

  // ── Direct save path (after user confirms) ──────────────────────────────────
  if (body.directSave) {
    const supabase = await getSupabaseServerClient();
    const { id, ...fields } = body.directSave;
    let saved: Record<string, unknown> | null = null;
    let saveError: string | null = null;

    if (id) {
      const { data, error } = await supabase
        .from("staff_members")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", String(id))
        .eq("organization_id", org.id)
        .select()
        .single();
      if (error) saveError = error.message;
      else saved = data as Record<string, unknown>;
    } else {
      const { data, error } = await supabase
        .from("staff_members")
        .insert({
          organization_id: org.id,
          full_name: String(fields.full_name ?? ""),
          role: String(fields.role ?? "provider"),
          specialty: (fields.specialty as string | null) ?? null,
          bio: (fields.bio as string | null) ?? null,
          phone: (fields.phone as string | null) ?? null,
          email: (fields.email as string | null) ?? null,
          accepts_online_booking: Boolean(fields.accepts_online_booking ?? false),
          status: "active",
        })
        .select()
        .single();
      if (error) saveError = error.message;
      else saved = data as Record<string, unknown>;
    }

    const stream = new ReadableStream({
      start(ctrl) {
        if (!saveError && saved) {
          const nameLabel = String(saved.full_name ?? "Ажилтан");
          const roleLabel = ROLE_LABELS[String(saved.role ?? "")] ?? String(saved.role ?? "");
          ctrl.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", content: `✓ "${nameLabel}" (${roleLabel}) хадгалагдлаа` })}\n\n`
            )
          );
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "staff_saved", staff: saved })}\n\n`));
        } else {
          ctrl.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text", content: `Алдаа: ${saveError}` })}\n\n`)
          );
        }
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        ctrl.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  // ── AI chat path ─────────────────────────────────────────────────────────────
  const messages = body.messages ?? [];
  const existingContext = body.existingStaff?.length
    ? `\n\nОдоо ${body.existingStaff.length} ажилтан бүртгэлтэй.`
    : "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT + existingContext }, ...messages],
          tools: TOOLS,
          tool_choice: "auto",
        });

        let toolName = "";
        let toolArgs = "";
        let inToolCall = false;

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;
          if (delta.content) send({ type: "text", content: delta.content });
          if (delta.tool_calls?.[0]) {
            const tc = delta.tool_calls[0];
            if (tc.id) inToolCall = true;
            if (tc.function?.name) toolName = tc.function.name;
            if (tc.function?.arguments) toolArgs += tc.function.arguments;
          }
          if (chunk.choices[0]?.finish_reason === "tool_calls" && inToolCall) {
            try {
              const parsed = JSON.parse(toolArgs) as {
                staffData?: Record<string, unknown>;
                display?: string;
              };
              if (toolName === "confirm_staff" && parsed.staffData && parsed.display) {
                send({ type: "confirm_staff", display: parsed.display, staffData: parsed.staffData });
              }
            } catch {
              send({ type: "error", message: "Parse error" });
            }
          }
        }
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
