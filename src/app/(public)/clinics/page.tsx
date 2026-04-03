import Link from "next/link";
import { Alert, PageHeader } from "@/components/ui";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { getPublicClinics } from "@/modules/clinic/public";

const SAMPLE_CLINICS = [
  {
    slug: "derma-house",
    name: "Derma House",
    location: "Ulaanbaatar, SBD",
    focus: "Laser, acne care, skin rejuvenation"
  },
  {
    slug: "lumi-clinic",
    name: "Lumi Clinic",
    location: "Ulaanbaatar, HUD",
    focus: "Injectables, facial programs, premium consultation"
  },
  {
    slug: "pure-aesthetics",
    name: "Pure Aesthetics",
    location: "Ulaanbaatar, BZD",
    focus: "Hydrafacial, peel, monthly care membership"
  }
];

export default function ClinicsDirectoryPage() {
  async function loadClinics() {
    try {
      return {
        clinics: await getPublicClinics(),
        fallback: false,
        migrationMissing: false
      };
    } catch (error) {
      if (isClinicFoundationMissingError(error)) {
        return {
          clinics: SAMPLE_CLINICS.map((clinic) => ({
            id: clinic.slug,
            name: clinic.name,
            slug: clinic.slug,
            status: "active",
            serviceCount: 0,
            serviceNames: []
          })),
          fallback: true,
          migrationMissing: true
        };
      }
      throw error;
    }
  }
  const clinicsPromise = loadClinics();
  return <ClinicsDirectoryPageInner clinicsPromise={clinicsPromise} />;
}

async function ClinicsDirectoryPageInner({
  clinicsPromise
}: {
  clinicsPromise: Promise<{
    clinics: Awaited<ReturnType<typeof getPublicClinics>>;
    fallback: boolean;
    migrationMissing: boolean;
  }>;
}) {
  const { clinics, fallback, migrationMissing } = await clinicsPromise;
  return (
    <main className="ui-page-main">
      <PageHeader
        title="Clinics"
        description="UbBeauty marketplace light. Эмнэлэг бүр өөрийн public profile, service menu, booking funnel-тэй байна."
      />

      {migrationMissing ? (
        <Alert variant="warning">
          Clinic public schema хараахан apply хийгдээгүй тул demo clinic list харуулж байна.
        </Alert>
      ) : null}

      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        {clinics.map((clinic) => (
          <article key={clinic.slug} className="ui-card ui-card--padded ui-card--stack">
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)" }}>{clinic.name}</h2>
              <p className="ui-text-muted" style={{ margin: 0 }}>Slug: {clinic.slug}</p>
              <p style={{ margin: 0 }}>
                {clinic.serviceCount > 0
                  ? `${clinic.serviceCount} bookable service байна. ${clinic.serviceNames.join(", ")}`
                  : fallback
                    ? "Demo clinic preview."
                    : "Service setup хараахан хийгдээгүй байна."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href={`/clinics/${clinic.slug}`} className="ui-button ui-button--primary ui-button--sm">
                View clinic
              </Link>
              <Link href={`/book/${clinic.slug}`} className="ui-button ui-button--secondary ui-button--sm">
                Book appointment
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
