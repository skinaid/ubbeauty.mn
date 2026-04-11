import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getAppointmentsByDate } from "@/modules/clinic/data";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date параметр буруу байна (YYYY-MM-DD)." }, { status: 400 });
  }

  try {
    const appointments = await getAppointmentsByDate(user.id, date);
    return NextResponse.json({ appointments });
  } catch (err) {
    console.error("[appointments-by-date]", err);
    return NextResponse.json({ error: "Өгөгдөл татахад алдаа гарлаа." }, { status: 500 });
  }
}
