import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Та эмнэлгийн үйлчилгээнүүдийг бүртгэх болон устгах AI туслах мөн.

## НЭМЭХ/ЗАСАХ FLOW
Алхам 1: Хэрэглэгч мэдээлэл өгнө → confirm_service tool дуудах
Алхам 2: Хэрэглэгч "Тийм" гэвэл → хадгалагдана

## УСТГАХ FLOW
Алхам 1: Хэрэглэгч устгах үйлчилгээний нэр/ID хэлнэ → confirm_delete tool дуудах
Алхам 2: Хэрэглэгч "Тийм" гэвэл → устгагдана (archived болно)
ТАВААРЛАЛ: confirm_delete-д serviceId талбарт existing services жагсаалтаас тухайн үйлчилгээний БОДИТ UUID-г дамжуул. Slug эсвэл нэр дамжуулж болохгүй — зөвхөн UUID (жишээ: "a1b2c3d4-...").

## Цуглуулах мэдээлэл (нэмэх/засах)
- name: үйлчилгээний нэр (заавал)
- description: дэлгэрэнгүй тайлбар
- duration_minutes: үргэлжлэх хугацаа минутаар (заавал, тоо)
- price_from: эхлэх үнэ MNT-ээр (заавал, тоо)
- is_bookable: онлайн захиалга боломжтой эсэх (default: true)

## Дэг журам
1. Нэмэх: нэр + хугацаа + үнэ авмагц confirm_service дуудах
2. Устгах: нэр/ID авмагц confirm_delete дуудах — display-д "[нэр] үйлчилгээг устгах уу?" гэж бичих
3. Монгол хэлний эелдэг, мэргэжлийн өнгө аялга
4. Нэг үйлдэл дуусмагц "Өөр зүйл хийх үү?" гэж асуух`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "confirm_service",
      description: "Үйлчилгээний мэдээллийг баталгаажуулахаар хэрэглэгчид харуулах (нэмэх/засах)",
      parameters: {
        type: "object",
        properties: {
          serviceData: {
            type: "object",
            properties: {
              id:               { type: "string" },
              name:             { type: "string" },
              description:      { type: "string" },
              duration_minutes: { type: "number" },
              price_from:       { type: "number" },
              is_bookable:      { type: "boolean" },
            },
            required: ["name", "duration_minutes", "price_from"],
          },
          display: { type: "string" },
        },
        required: ["serviceData", "display"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_delete",
      description: "Үйлчилгээ устгахаас баталгаажуулахаар хэрэглэгчид харуулах",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string", description: "Устгах үйлчилгээний ID" },
          serviceName: { type: "string", description: "Үйлчилгээний нэр (харуулахад)" },
          display: { type: "string", description: "Хэрэглэгчид харуулах баталгаажуулалтын текст" },
        },
        required: ["serviceId", "serviceName", "display"],
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
    existingServices?: unknown[];
    directSave?: Record<string, unknown> & { id?: string };
    directDelete?: { serviceId: string };
  };
  const encoder = new TextEncoder();

  // Direct delete
  if (body.directDelete) {
    const { serviceId } = body.directDelete;
    const supabase = await getSupabaseServerClient();

    // serviceId нь UUID эсэхийг шалгана — биш бол нэрээр хайна
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId);
    let resolvedId = serviceId;
    if (!isUuid) {
      const { data: found } = await supabase
        .from("services")
        .select("id")
        .eq("organization_id", org.id)
        .ilike("name", serviceId)
        .limit(1)
        .single();
      if (!found) {
        const stream = new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `"${serviceId}" нэртэй үйлчилгээ олдсонгүй.` })}

`));
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}

`));
            ctrl.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      }
      resolvedId = (found as { id: string }).id;
    }

    const { error } = await supabase
      .from("services")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", resolvedId)
      .eq("organization_id", org.id);
    const stream = new ReadableStream({
      start(ctrl) {
        if (error) {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `Алдаа: ${error.message}` })}

`));
        } else {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: "✓ Үйлчилгээ архивлагдлаа. Жагсаалтаас харагдахгүй болно." })}

`));
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "service_deleted", serviceId: resolvedId })}

`));
        }
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}

`));
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  // Direct save
  if (body.directSave) {
    const supabase = await getSupabaseServerClient();
    const { id, ...fields } = body.directSave;
    let saved: Record<string, unknown> | null = null;
    let saveError: string | null = null;

    if (id) {
      const { data, error } = await supabase
        .from("services")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", String(id)).eq("organization_id", org.id)
        .select().single();
      if (error) saveError = error.message; else saved = data as Record<string, unknown>;
    } else {
      const name = String(fields.name ?? "");
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("services")
        .insert({
          organization_id: org.id,
          name,
          slug,
          description: fields.description ?? null,
          duration_minutes: Number(fields.duration_minutes),
          price_from: Number(fields.price_from),
          currency: "MNT",
          is_bookable: Boolean(fields.is_bookable ?? true),
          status: "active",
        })
        .select().single();
      if (error) saveError = error.message; else saved = data as Record<string, unknown>;
    }

    const stream = new ReadableStream({
      start(ctrl) {
        if (!saveError && saved) {
          const nameLabel = String(saved.name ?? "Үйлчилгээ");
          const price = Number(saved.price_from).toLocaleString();
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `✓ "${nameLabel}" (₮${price}) хадгалагдлаа` })}\n\n`));
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "service_saved", service: saved })}\n\n`));
        } else {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `Алдаа: ${saveError}` })}\n\n`));
        }
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  // AI stream
  const messages = body.messages ?? [];
  const svcList = (body.existingServices ?? []) as Array<{ id: string; name: string; duration_minutes?: number; price_from?: number }>;
  const existingContext = svcList.length
    ? `\n\n## Одоогийн үйлчилгээнүүд (устгахад энэ жагсаалтаас serviceId-д зөвхөн UUID-г ашигл):\n` +
      svcList.map((s) => `- UUID: "${s.id}"  |  Нэр: "${s.name}"${s.duration_minutes ? `  |  ${s.duration_minutes}мин` : ""}${s.price_from ? `  |  ₮${Number(s.price_from).toLocaleString()}` : ""}`).join("\n")
    : "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini", stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT + existingContext }, ...messages],
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
              const parsed = JSON.parse(toolArgs) as {
                serviceData?: Record<string, unknown>;
                display?: string;
                serviceId?: string;
                serviceName?: string;
              };
              if (toolName === "confirm_service" && parsed.serviceData && parsed.display) {
                send({ type: "confirm_service", display: parsed.display, serviceData: parsed.serviceData });
              } else if (toolName === "confirm_delete" && parsed.serviceId && parsed.display) {
                send({ type: "confirm_delete", display: parsed.display, serviceId: parsed.serviceId, serviceName: parsed.serviceName ?? "" });
              }
            } catch { send({ type: "error", message: "Parse error" }); }
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
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
}
