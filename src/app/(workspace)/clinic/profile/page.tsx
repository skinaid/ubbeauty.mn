import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { getClinicProfile } from "@/modules/clinic/profile";
import { ProfilePageClient } from "./ProfilePageClient";

export default async function ClinicProfilePageRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getClinicProfile();

  return (
    <section style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0 2rem" }}>
        <PageHeader
          title="Эмнэлгийн профайл"
          description={
            <Link href="/clinic" style={{ fontSize: "0.85rem", color: "#6366f1" }}>
              ← Clinic Setup руу буцах
            </Link>
          }
        />
      </div>
      <ProfilePageClient initialProfile={profile} />
    </section>
  );
}
