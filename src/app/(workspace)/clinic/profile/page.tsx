import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { getClinicProfile } from "@/modules/clinic/profile";
import { getClinicPhotos } from "@/modules/clinic/photos";
import { ProfilePageClient } from "./ProfilePageClient";

export const dynamic = "force-dynamic";

export default async function ClinicProfilePageRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, photos] = await Promise.all([
    getClinicProfile(),
    getClinicPhotos(),
  ]);

  return <ProfilePageClient initialProfile={profile} initialPhotos={photos} />;
}
