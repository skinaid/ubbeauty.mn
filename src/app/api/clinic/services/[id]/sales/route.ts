import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getPeriodStart(period: string): string | null {
  const now = new Date();
  switch (period) {
    case "7d":
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    case "30d":
      now.setDate(now.getDate() - 30);
      return now.toISOString();
    case "90d":
      now.setDate(now.getDate() - 90);
      return now.toISOString();
    case "1y":
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString();
    case "all":
      return null;
    default:
      now.setDate(now.getDate() - 30);
      return now.toISOString();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getCurrentUserOrganization(user.id);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 403 });
    }

    const { id: serviceId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "30d";
    const periodStart = getPeriodStart(period);

    const supabase = await getSupabaseServerClient();

    // Query clinic_checkout_items joined with clinic_checkouts and patients
    let query = supabase
      .from("clinic_checkout_items")
      .select(
        `id, created_at, quantity, unit_price, line_total,
         checkout:clinic_checkouts!checkout_id(
           created_at, payment_status, currency,
           patient:patients!patient_id(full_name)
         )`
      )
      .eq("service_id", serviceId)
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });

    if (periodStart) {
      query = query.gte("created_at", periodStart);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[sales route] query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? []).map((row) => {
      const checkout = row.checkout as {
        created_at: string;
        payment_status: string;
        currency: string;
        patient: { full_name: string } | null;
      } | null;

      return {
        id: row.id,
        created_at: checkout?.created_at ?? row.created_at,
        patient_name: checkout?.patient?.full_name ?? "—",
        quantity: row.quantity,
        unit_price: row.unit_price,
        line_total: row.line_total,
        payment_status: checkout?.payment_status ?? "unknown",
        currency: checkout?.currency ?? "MNT",
      };
    });

    const totalRevenue = items.reduce((sum, item) => sum + item.line_total, 0);
    const totalSold = items.reduce((sum, item) => sum + item.quantity, 0);
    const avgPrice = items.length > 0 ? Math.round(totalRevenue / items.length) : 0;
    const currency = items[0]?.currency ?? "MNT";

    return NextResponse.json({
      summary: { totalRevenue, totalSold, avgPrice, currency },
      items,
    });
  } catch (err) {
    console.error("[sales route] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
