import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireClinicActor, hasClinicRole } from "@/modules/clinic/guard";
import { embedAndSaveService } from "@/modules/clinic/service-embeddings";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "No org" }, { status: 400 });

  const actor = await requireClinicActor();
  if ("error" in actor || !hasClinicRole(actor.role, ["owner", "manager"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_from, currency")
    .eq("organization_id", org.id)
    .eq("status", "active")
    .is("embedding", null); // only services without embedding

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let embedded = 0;
  for (const svc of (services ?? [])) {
    await embedAndSaveService(svc.id, org.id, svc);
    embedded++;
    // Rate limit: 100ms delay between calls
    await new Promise((r) => setTimeout(r, 100));
  }

  return NextResponse.json({ embedded, total: services?.length ?? 0 });
}
