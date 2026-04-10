import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WEEKDAY_MAP: Record<string, number> = {
  ням: 0, sunday: 0, sun: 0,
  даваа: 1, monday: 1, mon: 1,
  мягмар: 2, tuesday: 2, tue: 2,
  лхагва: 3, wednesday: 3, wed: 3,
  пүрэв: 4, thursday: 4, thu: 4,
  баасан: 5, friday: 5, fri: 5,
  бямба: 6, saturday: 6, sat: 6,
};

const SYSTEM_PROMPT = `Та эмнэлгийн ажилтнуудын ажлын цагийн дүрмийг тохируулах AI туслах мөн.

## 2 АЛХАМТ FLOW
Алхам 1: Мэдээлэл авмагц → confirm_rule tool дуудах
Алхам 2: "Тийм" → хадгалагдана

## Цуглуулах мэдээлэл (нэг дүрэм = нэг ажилтан + нэг өдөр)
- staff_member_id: ажилтны ID (staffMembers жагсаалтаас)
- weekday: 0=Ням, 1=Даваа, 2=Мягмар, 3=Лхагва, 4=Пүрэв, 5=Баасан, 6=Бямба
- start_local: эхлэх цаг "HH:MM" формат (жнь: "09:00")
- end_local: дуусах цаг "HH:MM" формат (жнь: "18:00")
- is_available: true=ажиллана, false=амарна (default: true)
- location_id: салбарын ID (locations жагсаалтаас, заавал биш)

## Чухал дүрэм
- "Даваа-Баасан" гэвэл 5 тусдаа дүрэм үүсгэх (weekday=1,2,3,4,5)
- Нэг confirm_rule дуудалтад нэг өдрийн нэг дүрэм л байна
- "09:00-18:00" гэвэл start_local="09:00", end_local="18:00"
- Ажилтны нэрийг ID-тэй тааруулж оруулна

## Дэг журам
1. Ажилтан + өдөр + цаг авмагц confirm_rule дуудах (нэг нэгээр)
2. Хэд хэдэн өдрийн дүрэм нэмэхэд нэг нэгээр confirm хийнэ
3. Монгол хэлний эелдэг өнгө аялга
4. Дуусмагц "Өөр ажилтны цаг тохируулах уу?" гэж асуух`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "confirm_rule",
      description: "Ажлын цагийн дүрмийг баталгаажуулахаар хэрэглэгчид харуулах",
      parameters: {
        type: "object",
        properties: {
          ruleData: {
            type: "object",
            properties: {
              staff_member_id: { type: "string" },
              weekday:         { type: "number", minimum: 0, maximum: 6 },
              start_local:     { type: "string" },
              end_local:       { type: "string" },
              is_available:    { type: "boolean" },
              location_id:     { type: "string" },
            },
            required: ["staff_member_id", "weekday", "start_local", "end_local"],
          },
          display: { type: "string" },
        },
        required: ["ruleData", "display"],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const org = await getCurrentUserOrganization(user.id);
  if (!org) return new Response("No organization", { status: 400 });

  const body = await req.json() as {
    messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    staffMembers?: Array<{ id: string; full_name: string }>;
    locations?: Array<{ id: string; name: string }>;
    directSave?: Record<string, unknown>;
  };
  const encoder = new TextEncoder();

  // Direct save
  if (body.directSave) {
    const supabase = await getSupabaseServerClient();
    const fields = body.directSave;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("staff_availability_rules")
      .insert({
        organization_id: org.id,
        staff_member_id: String(fields.staff_member_id),
        location_id: fields.location_id ?? null,
        weekday: Number(fields.weekday),
        start_local: String(fields.start_local),
        end_local: String(fields.end_local),
        is_available: Boolean(fields.is_available ?? true),
      })
      .select().single();

    const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
    const stream = new ReadableStream({
      start(ctrl) {
        if (!error && data) {
          const dayLabel = WEEKDAYS[Number(fields.weekday)] ?? String(fields.weekday);
          const timeLabel = `${String(fields.start_local).slice(0,5)}–${String(fields.end_local).slice(0,5)}`;
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `✓ ${dayLabel} ${timeLabel} хадгалагдлаа` })}\n\n`));
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "rule_saved", rule: data })}\n\n`));
        } else {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `Алдаа: ${(error as {message?:string})?.message ?? "Unknown"}` })}\n\n`));
        }
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  // AI stream
  const messages = body.messages ?? [];
  const staffContext = (body.staffMembers ?? []).map((s) => `- ${s.full_name} (id: ${s.id})`).join("\n");
  const locContext = (body.locations ?? []).map((l) => `- ${l.name} (id: ${l.id})`).join("\n");
  const context = `\n\nАжилтнууд:\n${staffContext || "(байхгүй)"}\n\nСалбарууд:\n${locContext || "(байхгүй)"}`;

  void WEEKDAY_MAP; // used in system context only

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini", stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT + context }, ...messages],
          tools: TOOLS, tool_choice: "auto",
        });
        let toolName = "", toolArgs = "", inToolCall = false;
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
              const parsed = JSON.parse(toolArgs) as { ruleData?: Record<string, unknown>; display?: string };
              if (toolName === "confirm_rule" && parsed.ruleData && parsed.display) {
                send({ type: "confirm_rule", display: parsed.display, ruleData: parsed.ruleData });
              }
            } catch { send({ type: "error", message: "Parse error" }); }
          }
        }
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
}
