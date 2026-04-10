import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const text =
        "Энэ функц удахгүй бэлэн болно. Одоогоор үйлчлүүлэгчийн мэдээллийг шууд хуудаснаас харна уу.";

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
      );
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
