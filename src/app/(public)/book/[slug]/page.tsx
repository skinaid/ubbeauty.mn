import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicBookingForm } from "@/components/clinic/public-booking-form";
import { Alert } from "@/components/ui";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { getPublicClinicBySlug } from "@/modules/clinic/public";

const BOOKING_POINTS = [
  "Үйлчилгээ сонгомогц suggested slot гарч ирнэ",
  "Provider болон салбараар сонголтоо нарийсгаж болно",
  "Хүсэлт илгээсний дараа clinic admin талд шууд бүртгэгдэнэ"
];

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
    <main className="consumer-booking-page">
      <section className="consumer-booking-page__hero">
        <div className="marketing-shell consumer-booking-page__hero-grid">
          <div className="consumer-booking-page__copy">
            <Link href={clinic ? `/clinics/${slug}` : "/clinics"} className="consumer-inline-link">
              ← Clinic profile руу буцах
            </Link>
            <span className="marketing-kicker">Online booking</span>
            <h1>{clinic ? `${clinic.name}-д цаг авах` : "Online booking preview"}</h1>
            <p>
              {clinic
                ? "Service-first booking flow. Эхлээд үйлчилгээ, дараа нь provider/location, эцэст нь slot ба холбоо барих мэдээллээ бөглөнө."
                : `Clinic slug: ${slug}. Booking schema хараахан apply хийгдээгүй байна.`}
            </p>

            <div className="consumer-booking-page__bullet-list">
              {BOOKING_POINTS.map((point) => (
                <article key={point} className="ui-card consumer-booking-page__point">
                  <p>{point}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="ui-card consumer-booking-page__summary">
            <p className="consumer-panel-label">Before you book</p>
            <strong>{clinic ? `${clinic.services.length} үйлчилгээ бэлэн` : "Booking preview"}</strong>
            <p>
              {clinic
                ? `${clinic.providers.length} provider, ${clinic.locations.length} салбарын мэдээлэл ашиглагдана.`
                : "Schema бэлэн болмогц бодит slot suggestion харагдана."}
            </p>
            <div className="consumer-chip-row">
              <span>Suggested slots</span>
              <span>Provider filter</span>
              <span>Location filter</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="consumer-booking-page__content">
        <div className="marketing-shell">
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
        </div>
      </section>
    </main>
  );
}
