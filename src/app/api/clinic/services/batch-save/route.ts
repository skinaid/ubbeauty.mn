import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireClinicActor, hasClinicRole } from "@/modules/clinic/guard";
import { embedAndSaveService } from "@/modules/clinic/service-embeddings";

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

  const actor = await requireClinicActor();
  if ("error" in actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasClinicRole(actor.role, ["owner", "manager"])) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

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

  for (let ci = 0; ci < categoryNames.length; ci++) {
    const name = categoryNames[ci];
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
        name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + (Date.now() + ci);
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

  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    const name = svc.name?.trim();
    if (!name) continue;

    const slug =
      name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + (Date.now() + i);
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

    // Fire-and-forget embedding (non-blocking)
    void embedAndSaveService(data.id, org.id, {
      name: data.name,
      description: data.description,
      duration_minutes: data.duration_minutes,
      price_from: Number(data.price_from),
      currency: data.currency,
      category_name: svc.category_name,
    }).catch(console.error);
  }

  return NextResponse.json({
    saved: savedServices.length,
    categories: categoryIdMap.size,
    services: savedServices,
  });
}
