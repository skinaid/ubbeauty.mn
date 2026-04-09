import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Та эмнэлгийн профайл мэдээллийг цуглуулж, DB-д хадгалах AI туслах мөн.

## ХАМГИЙН ЧУХАЛ ДҮРЭМ
Хэрэглэгч ямар нэг мэдээлэл өгсөн ТЭРХЭН МӨЧИД save_fields tool-ийг дуудах ёстой.
Хадгалсны дараа "✓ Хадгалагдлаа" гэж баталгаажуулж, дараагийн мэдээлэл асуу.
Хэзээ ч "хүлээж авсан" гэж хэлээд хадгалахгүй орхиж болохгүй.

## Талбарын нэрс (save_fields-д ашиглах)
- tagline: эмнэлгийн уриа үг (1 өгүүлбэр)
- description: дэлгэрэнгүй тайлбар (2-4 өгүүлбэр)
- phone: утасны дугаар (8 оронтой)
- website: вебсайт URL
- address: хаяг
- city: хот/дүүрэг
- services_summary: үйлчилгээний жагсаалт (array)
- social_instagram: Instagram URL эсвэл @handle
- social_facebook: Facebook URL
- founded_year: байгуулагдсан он (тоо)
- staff_count: ажилтны тоо (тоо)

## Харилцааны дэг журам
1. Хэрэглэгч мэдээлэл өгнө → ШУУД save_fields дуудна → "✓ [утга] хадгалагдлаа" гэнэ
2. Нэг удаад 1-2 л зүйл асуу
3. Бүх мэдээлэл бүрэн болсон үед "🎉 Профайл бүрэн боллоо" гэнэ
4. Монгол хэлний эелдэг, мэргэжлийн өнгө аялга барих
5. Утасны дугаар 8 оронтой байх ёстой — буруу бол засуулах`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "save_fields",
      description: "Баталгаажсан мэдээллийг DB-д хадгалах",
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

  const { messages } = (await req.json()) as {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  };

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
              const parsed = JSON.parse(toolArgs) as { fields?: Record<string, unknown> };

              if (toolName === "save_fields" && parsed.fields) {
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
