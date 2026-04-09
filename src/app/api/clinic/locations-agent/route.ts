import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function googlePlacesSearch(query: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + " Ulaanbaatar Mongolia")}&language=mn&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } }; formatted_address: string }>;
    };
    if (data.status === "OK" && data.results[0]) {
      const r = data.results[0];
      return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formattedAddress: r.formatted_address };
    }
  } catch { /* fallback */ }
  return null;
}

const SYSTEM_PROMPT = `Та эмнэлгийн салбарын байршил мэдээллийг цуглуулж, баталгаажуулж, хадгалах AI туслах мөн.

## ХАМГИЙН ЧУХАЛ ДҮРЭМ — 3 АЛХАМТ FLOW
Алхам 1: Хэрэглэгч хаяг өгнө → ШУУД search_place tool дуудах (Google Places хайлт)
Алхам 2: search_place утга авсан → confirm_location дуудах (зурагийн төв уу?)
Алхам 3: Хэрэглэгч "Тийм" гэвэл → мэдээлэл хадгалагдана

## Цуглуулах мэдээлэл (салбар бүрт)
- name: салбарын нэр
- address_line1: дэлгэрэнгүй хаяг
- district: дүүрэг
- city: хот (default: Ulaanbaatar)
- phone: утас
- latitude/longitude: search_place-аас авна
- working_hours: ажлын цаг {"mon":"09:00-18:00",...}
- description: тайлбар

## Дэг журам
1. Хэрэглэгч хаяг өгнө → ШУУД search_place дуудах
2. Гаргаас ирсэн утга авсан → confirm_location-д хийглэнэ
3. display текстэд: хаяг + GPS координат харуулах
4. Монгол хэлний эелдэг, мэргэжлийн өнгө аялга
5. Нэг салбар дуусмагц "Өөр салбар нэмэх үү?" гэж асуух`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_place",
      description: "Google Places API-аар хаяг хайлж GPS координат авах — хаяг тодорхой байвал даруун дуудах",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Хайлтын тулхуур үг (жнь: Эмнэлгийн нэр эсвэл хаяг)" },
        },
        required: ["query"],
      },
    },
  },
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
        let toolCallIdRef = "";
        let inToolCall = false;

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;
          if (delta.content) send({ type: "text", content: delta.content });
          if (delta.tool_calls?.[0]) {
            const tc = delta.tool_calls[0];
            if (tc.id) { inToolCall = true; toolCallIdRef = tc.id; }
            if (tc.function?.name) toolName = tc.function.name;
            if (tc.function?.arguments) toolArgs += tc.function.arguments;
          }
          if (chunk.choices[0]?.finish_reason === "tool_calls" && inToolCall) {
            try {
              const parsed = JSON.parse(toolArgs) as {
                locationData?: Record<string, unknown>;
                display?: string;
                query?: string;
              };

              if (toolName === "search_place" && parsed.query) {
                // Call Google Places, then feed result back to AI
                const placeResult = await googlePlacesSearch(parsed.query);
                const toolResultContent = placeResult
                  ? JSON.stringify({ lat: placeResult.lat, lng: placeResult.lng, formattedAddress: placeResult.formattedAddress, success: true })
                  : JSON.stringify({ success: false, message: "Олдогдсонгүй. Таамаглал координат ашигла." });

                // Continue AI with tool result
                const followUp = await openai.chat.completions.create({
                  model: "gpt-4o-mini",
                  stream: false,
                  messages: [
                    { role: "system", content: SYSTEM_PROMPT + existingContext },
                    ...messages,
                    { role: "assistant", content: null, tool_calls: [{ id: toolCallIdRef, type: "function", function: { name: "search_place", arguments: toolArgs } }] },
                    { role: "tool", tool_call_id: toolCallIdRef, content: toolResultContent },
                  ],
                  tools: TOOLS,
                  tool_choice: "auto",
                });

                const followChoice = followUp.choices[0];
                if (followChoice.message.content) {
                  send({ type: "text", content: followChoice.message.content });
                }
                const ftc = followChoice.message.tool_calls?.[0] as (OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { function: { name: string; arguments: string } }) | undefined;
                if (ftc?.function?.name === "confirm_location") {
                  const confirmParsed = JSON.parse(ftc.function.arguments) as { locationData?: Record<string, unknown>; display?: string };
                  if (confirmParsed.locationData && confirmParsed.display) {
                    send({ type: "confirm_location", display: confirmParsed.display, locationData: confirmParsed.locationData });
                  }
                }
              } else if (toolName === "confirm_location" && parsed.locationData && parsed.display) {
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
