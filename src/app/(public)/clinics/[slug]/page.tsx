import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { getPublicClinicBySlug } from "@/modules/clinic/public";

function formatSlot(slot: string): string {
  return new Date(slot).toLocaleString("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
        <main className="consumer-clinic-detail">
          <section className="consumer-clinic-detail__hero">
            <div className="marketing-shell">
              <div className="consumer-clinic-detail__hero-card ui-card">
                <span className="marketing-kicker">Clinic preview unavailable</span>
                <h1>Clinic detail demo mode-д хараахан бэлэн болоогүй байна.</h1>
                <p>Supabase migration apply хийгдсэний дараа service, provider, location, slot preview энд бодитоор харагдана.</p>
                <Alert variant="warning">
                  Clinic schema migration apply хийгдээгүй байна.
                </Alert>
                <Link href="/clinics" className="ui-button ui-button--secondary ui-button--sm">
                  Clinics рүү буцах
                </Link>
              </div>
            </div>
          </section>
        </main>
      );
    }
    notFound();
  }

  const firstService = clinic.services[0] ?? null;
  const serviceSlots = firstService ? clinic.slotSuggestionsByService[firstService.id] ?? [] : [];

  return (
    <main className="consumer-clinic-detail">
      <section className="consumer-clinic-detail__hero">
        <div className="marketing-shell consumer-clinic-detail__hero-grid">
          <div className="consumer-clinic-detail__copy">
            <Link href="/clinics" className="consumer-inline-link">
              ← Бүх эмнэлэг рүү
            </Link>
            <span className="marketing-kicker">Clinic profile</span>
            <h1>{clinic.name}</h1>
            <p>
              Үйлчилгээ, provider, салбар, ойрын боломжит цагийг нэг дэлгэц дээр харуулж booking шийдвэрийг
              хурдан болгоно.
            </p>

            <div className="consumer-clinic-detail__stats">
              <article className="ui-card consumer-clinic-detail__stat">
                <strong>{clinic.services.length}</strong>
                <span>bookable үйлчилгээ</span>
              </article>
              <article className="ui-card consumer-clinic-detail__stat">
                <strong>{clinic.providers.length}</strong>
                <span>provider</span>
              </article>
              <article className="ui-card consumer-clinic-detail__stat">
                <strong>{clinic.locations.length}</strong>
                <span>салбар</span>
              </article>
            </div>

            <div className="consumer-final__actions">
              <Link href={`/book/${slug}`} className="ui-button ui-button--hero-primary ui-button--lg">
                Сул цаг харах
              </Link>
              <Link href="/clinics" className="ui-button ui-button--secondary ui-button--lg">
                Өөр эмнэлэг үзэх
              </Link>
            </div>
          </div>

          <aside className="ui-card consumer-clinic-detail__slot-preview">
            <p className="consumer-panel-label">Quick slot preview</p>
            <strong>{firstService ? firstService.name : "Service preview"}</strong>
            <p>
              {firstService
                ? `${firstService.duration_minutes} мин · ${firstService.price_from} ${firstService.currency}`
                : "Online booking service хараахан нэмэгдээгүй байна."}
            </p>

            {serviceSlots.length > 0 ? (
              <div className="consumer-slot-list">
                {serviceSlots.map((slot) => (
                  <article key={slot} className="consumer-slot-card">
                    <div>
                      <strong>{firstService?.name}</strong>
                      <p>Suggested slot</p>
                    </div>
                    <span>{formatSlot(slot)}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="consumer-fallback-note">
                Ойрын slot preview одоогоор харагдахгүй байна. Booking page дээр provider болон салбараар нарийсгаж
                болно.
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className="consumer-clinic-detail__content">
        <div className="marketing-shell consumer-clinic-detail__sections">
          <section className="ui-card consumer-clinic-detail__section">
            <div className="consumer-section__intro">
              <span className="marketing-kicker">Service menu</span>
              <h2>Үнэ, хугацаа, тайлбар нь ил тод</h2>
            </div>

            {clinic.services.length === 0 ? (
              <p className="consumer-fallback-note">Одоогоор online booking-д нээлттэй үйлчилгээ бүртгэгдээгүй байна.</p>
            ) : (
              <div className="consumer-service-grid">
                {clinic.services.map((service) => (
                  <article key={service.id} className="consumer-service-card">
                    <div className="consumer-service-card__top">
                      <div>
                        <h3>{service.name}</h3>
                        <p>{service.description || "Товч тайлбар удахгүй нэмэгдэнэ."}</p>
                      </div>
                      <strong>
                        {service.price_from} {service.currency}
                      </strong>
                    </div>
                    <div className="consumer-chip-row">
                      <span>{service.duration_minutes} мин</span>
                      <span>{service.is_bookable ? "Bookable" : "Request only"}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="ui-card consumer-clinic-detail__section">
            <div className="consumer-section__intro">
              <span className="marketing-kicker">Providers & locations</span>
              <h2>Хаана, хэн дээр үйлчлүүлэхээ сонгоход бэлэн</h2>
            </div>

            <div className="consumer-clinic-detail__meta-grid">
              <div className="consumer-provider-list">
                <h3>Provider</h3>
                {clinic.providers.length === 0 ? (
                  <p className="consumer-fallback-note">Онлайн booking хүлээн авах provider одоогоор алга байна.</p>
                ) : (
                  clinic.providers.map((provider) => (
                    <article key={provider.id} className="consumer-provider-card">
                      <strong>{provider.full_name}</strong>
                      <p>{provider.specialty || "Clinic provider"}</p>
                    </article>
                  ))
                )}
              </div>

              <div className="consumer-provider-list">
                <h3>Салбар</h3>
                {clinic.locations.length === 0 ? (
                  <p className="consumer-fallback-note">Салбарын мэдээлэл одоогоор бүртгэгдээгүй байна.</p>
                ) : (
                  clinic.locations.map((location) => (
                    <article key={location.id} className="consumer-provider-card">
                      <strong>{location.name}</strong>
                      <p>
                        {[location.district, location.city].filter(Boolean).join(", ") || "Ulaanbaatar"}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
