import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ServiceInput = {
  name: string;
  price_from: number;
  duration_minutes: number;
  description?: string;
  is_bookable?: boolean;
  category_name?: string;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json() as { services: ServiceInput[] };
  const { services } = body;
  if (!Array.isArray(services) || services.length === 0) {
    return NextResponse.json({ error: "No services provided" }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();

  // Collect unique category names
  const categoryNames = [...new Set(services.map((s) => s.category_name).filter(Boolean))] as string[];

  // Upsert categories
  const categoryIdMap = new Map<string, string>();

  for (const name of categoryNames) {
    // Check if exists
    const { data: existing } = await supabase
      .from("service_categories")
      .select("id")
      .eq("organization_id", org.id)
      .ilike("name", name)
      .limit(1)
      .maybeSingle();

    if (existing) {
      categoryIdMap.set(name, existing.id);
    } else {
      const slug =
        name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
      const { data: created, error } = await supabase
        .from("service_categories")
        .insert({
          organization_id: org.id,
          name,
          slug,
          sort_order: 0,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Category insert error:", error);
        continue;
      }
      categoryIdMap.set(name, created.id);
    }
  }

  // Insert services
  const savedServices = [];
  const now = Date.now();

  for (const svc of services) {
    const name = svc.name?.trim();
    if (!name) continue;

    const slug =
      name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + now;
    const categoryId = svc.category_name ? (categoryIdMap.get(svc.category_name) ?? null) : null;

    const { data, error } = await supabase
      .from("services")
      .insert({
        organization_id: org.id,
        name,
        slug,
        description: svc.description ?? null,
        duration_minutes: Number(svc.duration_minutes) || 30,
        price_from: Number(svc.price_from) || 0,
        currency: "MNT",
        is_bookable: svc.is_bookable ?? true,
        status: "active",
        category_id: categoryId,
      })
      .select()
      .single();

    if (error) {
      console.error("Service insert error:", error);
      continue;
    }
    savedServices.push(data);
  }

  return NextResponse.json({
    saved: savedServices.length,
    categories: categoryIdMap.size,
    services: savedServices,
  });
}
