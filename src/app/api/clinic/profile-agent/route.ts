import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Та эмнэлгийн профайл мэдээллийг цуглуулж, баталгаажуулж, DB-д хадгалах AI туслах мөн.

## ХАМГИЙН ЧУХАЛ ДҮРЭМ — 2 АЛХАМТ FLOW
Алхам 1: Хэрэглэгч мэдээлэл өгнө → confirm_save tool дуудах (баталгаажуулалт)
Алхам 2: Хэрэглэгч "Тийм" / "Зөв" / "За" гэвэл → save_fields tool дуудах (хадгалах)

Жишээ:
- Хэрэглэгч: "Утас: 75000505"
- Чи: confirm_save дуудна {field: "phone", value: "75000505", display: "Утас: 75000505 — хадгалах уу?"}
- Хэрэглэгч: "Тийм"
- Чи: save_fields дуудна {fields: {phone: "75000505"}} → "✓ Утас хадгалагдлаа"

## Талбарын нэрс
- tagline: уриа үг (1 өгүүлбэр)
- description: дэлгэрэнгүй тайлбар (2-4 өгүүлбэр)
- phone: утасны дугаар (заавал 8 оронтой)
- website: вебсайт URL
- address: хаяг
- city: хот/дүүрэг
- services_summary: үйлчилгээний жагсаалт (array)
- social_instagram: Instagram
- social_facebook: Facebook
- founded_year: байгуулагдсан он (тоо)
- staff_count: ажилтны тоо (тоо)

## Дэг журам
1. Нэг удаад 1-2 л асуулт
2. Мэдээлэл авмагц confirm_save дуудах
3. Баталгаажсаны дараа save_fields дуудах → "✓ [талбар] хадгалагдлаа" гэнэ
4. Утас 8 оронтой биш бол засуулах
5. Бүх талбар дүүрсэн үед "🎉 Профайл бүрэн боллоо" гэнэ
6. Монгол хэлний эелдэг, мэргэжлийн өнгө аялга барих`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "confirm_save",
      description: "Хэрэглэгчээс хадгалахыг баталгаажуулахаар асуух — save_fields-ийн өмнө заавал дуудах",
      parameters: {
        type: "object",
        properties: {
          field:   { type: "string",  description: "Талбарын нэр (жнь: phone, tagline)" },
          value:   { type: "string",  description: "Хадгалах утга" },
          display: { type: "string",  description: "Хэрэглэгчид харуулах баталгаажуулалтын текст" },
        },
        required: ["field", "value", "display"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_fields",
      description: "Хэрэглэгч баталгаажуулсны дараа л дуудах — мэдээллийг DB-д хадгалах",
      parameters: {
        type: "object",
        properties: {
          fields: {
            type: "object",
            description: "Хадгалах талбарууд",
            properties: {
              tagline:          { type: "string" },
              description:      { type: "string" },
              phone:            { type: "string" },
              website:          { type: "string" },
              address:          { type: "string" },
              city:             { type: "string" },
              services_summary: { type: "array", items: { type: "string" } },
              social_instagram: { type: "string" },
              social_facebook:  { type: "string" },
              founded_year:     { type: "number" },
              staff_count:      { type: "number" },
            },
          },
        },
        required: ["fields"],
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
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    directSave?: Record<string, unknown>; // bypass AI, save directly
  };
  const { messages } = body;

  // Direct save — user confirmed, skip AI round-trip
  if (body.directSave) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("organizations")
      .update({ ...body.directSave, updated_at: new Date().toISOString() })
      .eq("id", org.id);
    const encoder2 = new TextEncoder();
    const fields = body.directSave;
    const confirmText = Object.keys(fields).map(k => `✓ ${k} хадгалагдлаа`).join(", ");
    const stream2 = new ReadableStream({
      start(ctrl) {
        if (!error) {
          ctrl.enqueue(encoder2.encode(`data: ${JSON.stringify({ type: "text", content: confirmText })}

`));
          ctrl.enqueue(encoder2.encode(`data: ${JSON.stringify({ type: "profile_updated", fields })}

`));
        } else {
          ctrl.enqueue(encoder2.encode(`data: ${JSON.stringify({ type: "text", content: `Алдаа: ${error.message}` })}

`));
        }
        ctrl.enqueue(encoder2.encode(`data: ${JSON.stringify({ type: "done" })}

`));
        ctrl.close();
      }
    });
    return new Response(stream2, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          tools: TOOLS,
          tool_choice: "auto",
        });

        let toolCallId = "";
        let toolName = "";
        let toolArgs = "";
        let inToolCall = false;

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Text streaming
          if (delta.content) {
            send({ type: "text", content: delta.content });
          }

          // Tool call detection
          if (delta.tool_calls?.[0]) {
            const tc = delta.tool_calls[0];
            if (tc.id) {
              toolCallId = tc.id;
              inToolCall = true;
            }
            if (tc.function?.name) toolName = tc.function.name;
            if (tc.function?.arguments) toolArgs += tc.function.arguments;
          }

          // Finish
          if (chunk.choices[0]?.finish_reason === "tool_calls" && inToolCall) {
            try {
              const parsed = JSON.parse(toolArgs) as {
                fields?: Record<string, unknown>;
                field?: string;
                value?: string;
                display?: string;
              };

              if (toolName === "confirm_save" && parsed.field && parsed.display) {
                // Send confirmation request to client — no DB write yet
                send({ type: "confirm_request", field: parsed.field, value: parsed.value, display: parsed.display });
              } else if (toolName === "save_fields" && parsed.fields) {
                const supabase = await getSupabaseServerClient();
                const updateData: Record<string, unknown> = {
                  ...parsed.fields,
                  updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                  .from("organizations")
                  .update(updateData)
                  .eq("id", org.id);

                if (error) {
                  send({ type: "tool_result", toolCallId, success: false, error: error.message });
                } else {
                  send({ type: "tool_result", toolCallId, success: true, savedFields: parsed.fields });
                  send({ type: "profile_updated", fields: parsed.fields });
                }
              }
            } catch {
              send({ type: "error", message: "Tool parse error" });
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
