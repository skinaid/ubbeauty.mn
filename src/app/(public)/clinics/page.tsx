import Link from "next/link";
import { Alert } from "@/components/ui";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { getPublicClinics } from "@/modules/clinic/public";

const SAMPLE_CLINICS = [
  {
    slug: "derma-house",
    name: "Derma House",
    location: "Ulaanbaatar, SBD",
    focus: "Laser, acne care, skin rejuvenation",
    services: ["Hydrafacial", "Laser toning", "Acne program"]
  },
  {
    slug: "lumi-clinic",
    name: "Lumi Clinic",
    location: "Ulaanbaatar, HUD",
    focus: "Injectables, facial programs, premium consultation",
    services: ["Skin booster", "Jawline contour", "Consultation"]
  },
  {
    slug: "pure-aesthetics",
    name: "Pure Aesthetics",
    location: "Ulaanbaatar, BZD",
    focus: "Hydrafacial, peel, monthly care membership",
    services: ["Peel therapy", "Glow package", "Membership care"]
  }
] as const;

const FILTER_CHIPS = ["Ойрын сул цаг", "Hydrafacial", "Consultation", "Laser", "Хямдралтай багц"];

type ConsumerClinicCard = {
  slug: string;
  name: string;
  location: string;
  focus: string;
  services: string[];
  serviceCount: number;
};

export default function ClinicsDirectoryPage() {
  async function loadClinics() {
    try {
      const clinics = await getPublicClinics();
      return {
        clinics: clinics.map((clinic, index) => ({
          slug: clinic.slug,
          name: clinic.name,
          location: SAMPLE_CLINICS[index % SAMPLE_CLINICS.length]?.location ?? "Ulaanbaatar",
          focus:
            clinic.serviceNames.length > 0
              ? clinic.serviceNames.join(", ")
              : SAMPLE_CLINICS[index % SAMPLE_CLINICS.length]?.focus ?? "Skin care, injectables, consultation",
          services:
            clinic.serviceNames.length > 0
              ? clinic.serviceNames
              : [...SAMPLE_CLINICS[index % SAMPLE_CLINICS.length].services],
          serviceCount: clinic.serviceCount
        })),
        fallback: false,
        migrationMissing: false
      };
    } catch (error) {
      if (isClinicFoundationMissingError(error)) {
        return {
          clinics: SAMPLE_CLINICS.map((clinic) => ({
            slug: clinic.slug,
            name: clinic.name,
            location: clinic.location,
            focus: clinic.focus,
            services: [...clinic.services],
            serviceCount: clinic.services.length
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
    clinics: ConsumerClinicCard[];
    fallback: boolean;
    migrationMissing: boolean;
  }>;
}) {
  const { clinics, fallback, migrationMissing } = await clinicsPromise;

  return (
    <main className="consumer-directory">
      <section className="consumer-directory__hero">
        <div className="marketing-shell">
          <div className="consumer-directory__hero-grid">
            <div className="consumer-directory__copy">
              <span className="marketing-kicker">Marketplace directory</span>
              <h1>Өөрт тохирох эмнэлгийг илүү хурдан ол.</h1>
              <p>
                Үйлчилгээ, үнэ, дүүрэг, booking readiness-ээр харьцуулж, clinic detail руу орон сул цаг руу шууд
                шилжинэ.
              </p>
              <div className="consumer-filter-row">
                {FILTER_CHIPS.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>
            </div>

            <div className="consumer-directory__summary ui-card">
              <div className="consumer-directory__summary-stat">
                <strong>{clinics.length}</strong>
                <span>онцолсон эмнэлэг</span>
              </div>
              <div className="consumer-directory__summary-stat">
                <strong>
                  {clinics.reduce((sum, clinic) => sum + clinic.serviceCount, 0)}
                </strong>
                <span>нийт үйлчилгээний санал</span>
              </div>
              <p>Эндээс clinic profile, service menu, booking entry-үүд бүгд нэг ижил consumer UX-ээр харагдана.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="consumer-directory__content">
        <div className="marketing-shell">
          {migrationMissing ? (
            <Alert variant="warning">
              Clinic public schema хараахан apply хийгдээгүй тул demo clinic list харуулж байна.
            </Alert>
          ) : null}

          {fallback ? (
            <p className="consumer-fallback-note">
              Demo clinics preview ашиглаж байна. Бодит public clinic data нэмэгдэхэд энэ grid автоматаар шинэчлэгдэнэ.
            </p>
          ) : null}

          <div className="consumer-directory__grid">
            {clinics.map((clinic) => (
              <article key={clinic.slug} className="ui-card consumer-directory-card">
                <div className="consumer-directory-card__top">
                  <div>
                    <h2>{clinic.name}</h2>
                    <p>{clinic.location}</p>
                  </div>
                  <span>{clinic.serviceCount}+ үйлчилгээ</span>
                </div>

                <p className="consumer-directory-card__focus">{clinic.focus}</p>

                <div className="consumer-chip-row">
                  {clinic.services.slice(0, 3).map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>

                <div className="consumer-directory-card__actions">
                  <Link href={`/clinics/${clinic.slug}`} className="ui-button ui-button--secondary ui-button--sm">
                    Дэлгэрэнгүй үзэх
                  </Link>
                  <Link href={`/book/${clinic.slug}`} className="ui-button ui-button--primary ui-button--sm">
                    Сул цаг руу орох
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
