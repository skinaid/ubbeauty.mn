import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Та эмнэлгийн салбарын байршил мэдээллийг цуглуулж, баталгаажуулж, хадгалах AI туслах мөн.

## ХАМГИЙН ЧУХАЛ ДҮРЭМ — 2 АЛХАМТ FLOW
Алхам 1: Хэрэглэгч мэдээлэл өгнө → confirm_location tool дуудах (баталгаажуулалт)
Алхам 2: Хэрэглэгч "Тийм" / "Зөв" / "За" гэвэл → мэдээлэл хадгалагдана (client хийнэ)

## Цуглуулах мэдээлэл (салбар бүрт)
- name: салбарын нэр
- address_line1: дэлгэрэнгүй хаяг
- district: дүүрэг
- city: хот (default: Улаанбаатар)
- phone: утас
- latitude: GPS өргөрөг (хаягаас таамаглах)
- longitude: GPS уртраг (хаягаас таамаглах)
- working_hours: ажлын цаг {"mon":"09:00-18:00",...}
- description: тайлбар

## GPS координат
Монгол улсын хаягаас приблизитель GPS координат таамаглах:
- Улаанбаатар хот: 47.9, 106.9 орчим
- Сүхбаатар дүүрэг: lat 47.91, lng 106.91
- Баянзүрх дүүрэг: lat 47.92, lng 106.98
- Хан-Уул дүүрэг: lat 47.87, lng 106.89
- Чингэлтэй дүүрэг: lat 47.93, lng 106.92
- Налайх: lat 47.77, lng 107.27
- Дэлгэрэнгүй хаяг байвал тэр орчмын координат ашиглах

## Дэг журам
1. Нэг удаад 1-2 асуулт
2. Мэдээлэл авмагц confirm_location дуудах
3. display текстэд бүх мэдээллийг тоочно
4. Монгол хэлний эелдэг өнгө аялга
5. Нэг салбар дуусмагц "Өөр салбар нэмэх үү?" гэж асуух`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "confirm_location",
      description: "Салбарын мэдээллийг баталгаажуулахаар хэрэглэгчид харуулах",
      parameters: {
        type: "object",
        properties: {
          locationData: {
            type: "object",
            description: "Хадгалах салбарын мэдээлэл",
            properties: {
              id:            { type: "string", description: "Засах үед өмнөх id, шинэ бол null" },
              name:          { type: "string" },
              address_line1: { type: "string" },
              district:      { type: "string" },
              city:          { type: "string" },
              phone:         { type: "string" },
              latitude:      { type: "number" },
              longitude:     { type: "number" },
              working_hours: { type: "object" },
              description:   { type: "string" },
            },
          },
          display: { type: "string", description: "Хэрэглэгчид харуулах баталгаажуулалтын текст" },
        },
        required: ["locationData", "display"],
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
    existingLocations?: unknown[];
    directSave?: Record<string, unknown> & { id?: string };
  };

  const encoder = new TextEncoder();

  // Direct save path
  if (body.directSave) {
    const supabase = await getSupabaseServerClient();
    const { id, ...fields } = body.directSave;

    let savedLocation: Record<string, unknown> | null = null;
    let saveError: string | null = null;

    if (id) {
      // Update existing
      const { data, error } = await supabase
        .from("clinic_locations")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", org.id)
        .select()
        .single();
      if (error) saveError = error.message;
      else savedLocation = data as Record<string, unknown>;
    } else {
      // Insert new
      const name = String(fields.name ?? "Салбар");
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("clinic_locations")
        .insert({
          organization_id: org.id,
          name,
          slug,
          address_line1: fields.address_line1 ?? null,
          district: fields.district ?? null,
          city: String(fields.city ?? "Ulaanbaatar"),
          phone: fields.phone ?? null,
          latitude: fields.latitude ?? null,
          longitude: fields.longitude ?? null,
          working_hours: fields.working_hours ?? null,
          description: fields.description ?? null,
        })
        .select()
        .single();
      if (error) saveError = error.message;
      else savedLocation = data as Record<string, unknown>;
    }

    const stream = new ReadableStream({
      start(ctrl) {
        if (!saveError && savedLocation) {
          const nameLabel = String(savedLocation.name ?? "Салбар");
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `✓ "${nameLabel}" салбар хадгалагдлаа` })}\n\n`));
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "location_saved", location: savedLocation })}\n\n`));
        } else {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: `Алдаа: ${saveError}` })}\n\n`));
        }
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  // AI streaming path
  const messages = body.messages ?? [];
  const existingContext = body.existingLocations?.length
    ? `\n\nОдоо бүртгэлтэй ${body.existingLocations.length} салбар байна.`
    : "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + existingContext },
            ...messages,
          ],
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
              const parsed = JSON.parse(toolArgs) as { locationData?: Record<string, unknown>; display?: string };
              if (toolName === "confirm_location" && parsed.locationData && parsed.display) {
                send({ type: "confirm_location", display: parsed.display, locationData: parsed.locationData });
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

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
