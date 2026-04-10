import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VISION_SYSTEM_PROMPT = `You are extracting a clinic service menu from this document/image.
Return ONLY valid JSON (no markdown) in this exact format:
{
  "categories": [
    {
      "name": "CATEGORY NAME",
      "services": [
        { "name": "service name", "price_from": 50000, "duration_minutes": 30, "description": "optional notes", "is_bookable": true }
      ]
    }
  ]
}
Rules:
- Group services under their category headers
- price_from must be a number (MNT), remove commas/₮ symbols
- duration_minutes: extract from description if mentioned (e.g. "60 мин" → 60), default to 30 if not found
- is_bookable: true by default
- description: include any notes/details from the document
- Return empty categories array if nothing found`;

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

type ParsedResult = {
  categories: ParsedCategory[];
};

async function parseViaVision(base64Data: string, mimeType: string): Promise<ParsedResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_SYSTEM_PROMPT },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content ?? "";
  // Strip any accidental markdown fences
  const cleaned = content.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned) as ParsedResult;
}

function parseExcel(buffer: Buffer): ParsedResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const categories: ParsedCategory[] = [];
  let currentCategory: ParsedCategory | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

    for (const row of rows) {
      if (!row || row.length === 0) continue;

      // Detect header/category row: a row where only the first 1-2 cells are filled
      // and there's no numeric price value anywhere
      const cells = row.map((c) => String(c ?? "").trim());
      const nonEmpty = cells.filter((c) => c !== "");

      if (nonEmpty.length === 0) continue;

      // Check if this is a category/header row:
      // - Has text in first cell
      // - No numeric price column (column index 2 or 3 is empty or non-numeric)
      const priceCell = cells[2] ?? cells[3] ?? "";
      const hasPrice = /^\d[\d,. ]*$/.test(priceCell.replace(/[₮,\s]/g, ""));

      if (!hasPrice && nonEmpty.length <= 3 && cells[0] !== "") {
        // Likely a category header — skip rows that look like column headers
        const firstCell = cells[0].toLowerCase();
        if (firstCell.includes("№") || firstCell.includes("нэр") || firstCell === "#" || firstCell === "name") {
          continue; // skip column header row
        }
        currentCategory = { name: cells[0], services: [] };
        categories.push(currentCategory);
        continue;
      }

      // Otherwise try to parse as a service row
      // Columns: [№, Нэр, Үнэ, Тайлбар] or [Нэр, Үнэ, Тайлбар]
      let name = "";
      let priceRaw = "";
      let description = "";

      if (cells.length >= 3 && /^\d+$/.test(cells[0])) {
        // Has a leading index column
        name = cells[1] ?? "";
        priceRaw = cells[2] ?? "";
        description = cells[3] ?? "";
      } else {
        name = cells[0] ?? "";
        priceRaw = cells[1] ?? "";
        description = cells[2] ?? "";
      }

      if (!name) continue;

      const priceNum = Number(String(priceRaw).replace(/[₮,\s]/g, "").replace(/\s/g, ""));
      if (isNaN(priceNum) || priceNum === 0) {
        // Could be another category header
        if (!currentCategory) {
          currentCategory = { name, services: [] };
          categories.push(currentCategory);
        } else {
          currentCategory = { name, services: [] };
          categories.push(currentCategory);
        }
        continue;
      }

      // Extract duration from description
      const durationMatch = /(\d+)\s*мин/i.exec(description);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 30;

      const service: ParsedService = {
        name,
        price_from: priceNum,
        duration_minutes: duration,
        description: description || "",
        is_bookable: true,
      };

      if (!currentCategory) {
        currentCategory = { name: sheetName, services: [] };
        categories.push(currentCategory);
      }
      currentCategory.services.push(service);
    }
  }

  // Remove empty categories
  return { categories: categories.filter((c) => c.services.length > 0) };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 400 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Файлын хэмжээ 10MB-аас хэтэрсэн байна." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();

    let result: ParsedResult;

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      result = parseExcel(buffer);
    } else {
      // Images (jpeg/png/webp) and PDF — use vision
      const base64 = buffer.toString("base64");
      const effectiveMime =
        mimeType ||
        (fileName.endsWith(".pdf")
          ? "application/pdf"
          : fileName.endsWith(".png")
          ? "image/png"
          : "image/jpeg");

      // For PDFs, treat as image/jpeg for base64 data URL (GPT-4o can handle PDF rendered as image)
      const visionMime = effectiveMime === "application/pdf" ? "image/jpeg" : effectiveMime;
      result = await parseViaVision(base64, visionMime);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("parse-menu error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 500 }
    );
  }
}
