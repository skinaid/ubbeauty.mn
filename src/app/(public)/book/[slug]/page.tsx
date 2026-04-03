import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicBookingForm } from "@/components/clinic/public-booking-form";
import { Alert, PageHeader } from "@/components/ui";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { getPublicClinicBySlug } from "@/modules/clinic/public";

export default async function BookingPreviewPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let clinic = null;
  let migrationMissing = false;

  try {
    clinic = await getPublicClinicBySlug(slug);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  if (!clinic && !migrationMissing) {
    notFound();
  }

  return (
    <main className="ui-page-main">
      <PageHeader
        title={clinic ? `${clinic.name} · Online booking` : "Online booking preview"}
        description={
          clinic
            ? "Service сонголт дээр суурилсан appointment request урсгал. Одоо staff availability rule дээр суурилсан suggested slot ба validation нэмэгдсэн."
            : `Clinic slug: ${slug}. Booking schema хараахан apply хийгдээгүй байна.`
        }
      />

      {migrationMissing ? (
        <Alert variant="warning">
          Booking schema хараахан идэвхжээгүй байна. Migration apply хийсний дараа энэ route appointment request
          үүсгэдэг болно.
        </Alert>
      ) : null}

      {clinic ? (
        <PublicBookingForm
          clinicSlug={slug}
          clinicName={clinic.name}
          services={clinic.services}
          providers={clinic.providers}
          locations={clinic.locations}
          slotSuggestionsByService={clinic.slotSuggestionsByService}
        />
      ) : null}

      <section className="ui-card ui-card--padded ui-card--stack">
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Booking MVP урсгал</h2>
        <ol style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>Service сонгоно</li>
          <li>Хүссэн appointment time-аа оруулна</li>
          <li>Patient мэдээллээ бөглөнө</li>
          <li>Clinic admin workspace дээр booked appointment болж бүртгэгдэнэ</li>
        </ol>
        <Link href={`/clinics/${slug}`} className="ui-table__link">
          ← Clinic page руу буцах
        </Link>
      </section>
    </main>
  );
}
