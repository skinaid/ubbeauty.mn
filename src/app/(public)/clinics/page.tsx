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
  district: string | null;
  focus: string;
  services: string[];
  serviceCount: number;
  minPrice: number | null;
  currency: string | null;
};

function readSearchValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default function ClinicsDirectoryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  async function loadClinics() {
    try {
      const clinics = await getPublicClinics();
      return {
        clinics: clinics.map((clinic, index) => {
          const sampleClinic = SAMPLE_CLINICS[index % SAMPLE_CLINICS.length];
          const areaLabel = [clinic.district, clinic.city].filter(Boolean).join(", ");

          return {
            slug: clinic.slug,
            name: clinic.name,
            location: clinic.locationLabel || areaLabel || sampleClinic?.location || "Ulaanbaatar",
            district: clinic.district,
            focus:
              clinic.serviceNames.length > 0
                ? clinic.serviceNames.join(", ")
                : sampleClinic?.focus ?? "Skin care, injectables, consultation",
            services: clinic.serviceNames.length > 0 ? clinic.serviceNames : [...sampleClinic.services],
            serviceCount: clinic.serviceCount,
            minPrice: clinic.minPrice,
            currency: clinic.currency
          };
        }),
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
            district: clinic.location.split(",").at(-1)?.trim() ?? null,
            focus: clinic.focus,
            services: [...clinic.services],
            serviceCount: clinic.services.length,
            minPrice: null,
            currency: null
          })),
          fallback: true,
          migrationMissing: true
        };
      }
      throw error;
    }
  }
  const clinicsPromise = loadClinics();
  return <ClinicsDirectoryPageInner clinicsPromise={clinicsPromise} searchParams={searchParams} />;
}

async function ClinicsDirectoryPageInner({
  clinicsPromise,
  searchParams
}: {
  clinicsPromise: Promise<{
    clinics: ConsumerClinicCard[];
    fallback: boolean;
    migrationMissing: boolean;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { clinics, fallback, migrationMissing } = await clinicsPromise;
  const query = readSearchValue(params.q).toLowerCase();
  const district = readSearchValue(params.district);
  const service = readSearchValue(params.service).toLowerCase();

  const districts = Array.from(new Set(clinics.map((clinic) => clinic.district).filter(Boolean))) as string[];
  const services = Array.from(new Set(clinics.flatMap((clinic) => clinic.services))).sort();
  const filteredClinics = clinics.filter((clinic) => {
    const matchesQuery =
      !query ||
      clinic.name.toLowerCase().includes(query) ||
      clinic.focus.toLowerCase().includes(query) ||
      clinic.services.some((item) => item.toLowerCase().includes(query)) ||
      clinic.location.toLowerCase().includes(query);

    const matchesDistrict = !district || clinic.district === district;
    const matchesService = !service || clinic.services.some((item) => item.toLowerCase() === service);
    return matchesQuery && matchesDistrict && matchesService;
  });

  return (
    <main className="consumer-directory">
      <section className="consumer-directory__hero">
        <div className="marketing-shell">
          <div className="consumer-directory__hero-grid">
            <div className="consumer-directory__copy">
              <p className="ui-text-muted" style={{ margin: 0 }}>
                <Link href="/">← Нүүр</Link>
                {" · "}
                <Link href="/pricing">Үнэ, багц</Link>
              </p>
              <span className="marketing-kicker">Marketplace directory</span>
              <h1>Өөрт тохирох эмнэлгийг илүү хурдан ол.</h1>
              <p>
                Үйлчилгээ, үнэ, дүүрэг, booking readiness-ээр харьцуулж, clinic detail руу орон сул цаг руу шууд
                шилжинэ.
              </p>
              <form method="get" className="ui-card" style={{ display: "grid", gap: "0.9rem", padding: "1rem" }}>
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  <label htmlFor="clinic-search" className="ui-label">
                    Эмнэлэг эсвэл үйлчилгээ хайх
                  </label>
                  <input
                    id="clinic-search"
                    type="search"
                    name="q"
                    className="ui-input"
                    placeholder="Hydrafacial, laser, acne care..."
                    defaultValue={readSearchValue(params.q)}
                  />
                </div>
                <div className="consumer-booking-form__grid">
                  <div style={{ display: "grid", gap: "0.4rem" }}>
                    <label htmlFor="district" className="ui-label">
                      Дүүрэг
                    </label>
                    <select id="district" name="district" className="ui-input" defaultValue={district}>
                      <option value="">Бүх дүүрэг</option>
                      {districts.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gap: "0.4rem" }}>
                    <label htmlFor="service" className="ui-label">
                      Үйлчилгээ
                    </label>
                    <select id="service" name="service" className="ui-input" defaultValue={service}>
                      <option value="">Бүх үйлчилгээ</option>
                      {services.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  <button type="submit" className="ui-button ui-button--primary ui-button--sm">
                    Шүүх
                  </button>
                  <Link href="/clinics" className="ui-button ui-button--ghost ui-button--sm">
                    Цэвэрлэх
                  </Link>
                </div>
              </form>
              <div className="consumer-filter-row">
                {FILTER_CHIPS.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>
            </div>

            <div className="consumer-directory__summary ui-card">
              <div className="consumer-directory__summary-stat">
                <strong>{filteredClinics.length}</strong>
                <span>шүүгдсэн эмнэлэг</span>
              </div>
              <div className="consumer-directory__summary-stat">
                <strong>
                  {filteredClinics.reduce((sum, clinic) => sum + clinic.serviceCount, 0)}
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
            {filteredClinics.length === 0 ? (
              <article className="ui-card consumer-directory-card">
                <div className="consumer-directory-card__top">
                  <div>
                    <h2>Хайлтад тохирох эмнэлэг олдсонгүй</h2>
                    <p>Өөр district эсвэл үйлчилгээ сонгоод дахин оролдоно уу.</p>
                  </div>
                </div>
                <div className="consumer-directory-card__actions">
                  <Link href="/clinics" className="ui-button ui-button--secondary ui-button--sm">
                    Бүх эмнэлэг рүү буцах
                  </Link>
                </div>
              </article>
            ) : null}

            {filteredClinics.map((clinic) => (
              <article key={clinic.slug} className="ui-card consumer-directory-card">
                <div className="consumer-directory-card__top">
                  <div>
                    <h2>{clinic.name}</h2>
                    <p>{clinic.location}</p>
                  </div>
                  <span>
                    {clinic.minPrice && clinic.currency
                      ? `${clinic.minPrice.toLocaleString("mn-MN")} ${clinic.currency}-с`
                      : `${clinic.serviceCount}+ үйлчилгээ`}
                  </span>
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
