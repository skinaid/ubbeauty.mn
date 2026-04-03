import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, PageHeader } from "@/components/ui";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { getPublicClinicBySlug } from "@/modules/clinic/public";

export default async function ClinicDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let migrationMissing = false;
  let clinic = null;

  try {
    clinic = await getPublicClinicBySlug(slug);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  if (!clinic) {
    if (migrationMissing) {
      return (
        <main className="ui-page-main">
          <PageHeader
            title="Clinic preview unavailable"
            description="Clinic schema migration хараахан apply хийгдээгүй тул public detail page demo mode-д бэлэн болоогүй байна."
          />
          <Alert variant="warning">
            Supabase migration-аа apply хийсний дараа энэ clinic detail page бодит service list-тэй ажиллана.
          </Alert>
          <Link href="/clinics" className="ui-table__link">
            ← Clinics рүү буцах
          </Link>
        </main>
      );
    }
    notFound();
  }

  return (
    <main className="ui-page-main">
      <PageHeader
        title={clinic.name}
        description="Public clinic profile. Service menu, positioning, online booking entry point энэ хэсэгт төвлөрнө."
      />

      <section className="ui-card ui-card--padded ui-card--stack">
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Service menu</h2>
        {clinic.services.length === 0 ? (
          <p style={{ margin: 0 }}>Одоогоор online booking-д нээлттэй үйлчилгээ бүртгэгдээгүй байна.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {clinic.services.map((service) => (
              <li key={service.id}>
                <strong>{service.name}</strong>
                {service.description ? ` · ${service.description}` : ""}
                {` · ${service.duration_minutes} мин · ${service.price_from} ${service.currency}`}
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href={`/book/${slug}`} className="ui-button ui-button--primary ui-button--sm">
            Book now
          </Link>
          <Link href="/clinics" className="ui-button ui-button--ghost ui-button--sm">
            Back to clinics
          </Link>
        </div>
      </section>
    </main>
  );
}
