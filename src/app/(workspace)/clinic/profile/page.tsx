import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { getClinicProfile } from "@/modules/clinic/profile";
import { ProfilePageClient } from "./ProfilePageClient";

export const dynamic = "force-dynamic";

export default async function ClinicProfilePageRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getClinicProfile();

  return <ProfilePageClient initialProfile={profile} />;
}
