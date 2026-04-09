import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicProfileChatPanel } from "@/components/clinic/clinic-profile-chat-panel";
import { ClinicProfileView } from "@/components/clinic/clinic-profile-view";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { getClinicProfile } from "@/modules/clinic/profile";

function SplitLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <>
      <style>{`
        .clinic-profile-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          height: calc(100vh - 60px);
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .clinic-profile-split {
            grid-template-columns: 1fr;
            height: auto;
            overflow: visible;
          }
        }
      `}</style>
      <div className="clinic-profile-split">
        <div
          style={{
            borderRight: "1px solid var(--ui-border, #e5e7eb)",
            overflowY: "auto",
            padding: "2rem",
          }}
        >
          {left}
        </div>
        <div
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {right}
        </div>
      </div>
    </>
  );
}

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
      <SplitLayout
        left={<ClinicProfileView profile={profile} />}
        right={<ClinicProfileChatPanel orgId={profile?.id ?? ""} />}
      />
    </section>
  );
}
