import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { getClinicProfile } from "@/modules/clinic/profile";
import { ProfilePageClient } from "./ProfilePageClient";

export const dynamic = "force-dynamic";

export default async function ClinicProfilePageRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getClinicProfile();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <Link href="/clinic" style={{ fontSize: "0.85rem", color: "#6b7280", textDecoration: "none" }}>← Буцах</Link>
        <div>
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Эмнэлгийн профайл</h1>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>AI туслахтай ярилцаж профайлаа бөглөх</p>
        </div>
      </div>
      <ProfilePageClient initialProfile={profile} />
    </div>
  );
}
