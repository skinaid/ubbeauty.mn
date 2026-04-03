import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { getCurrentUser } from "@/modules/auth/session";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { getPublicClinics } from "@/modules/clinic/public";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

export const metadata: Metadata = {
  title: `${appConfig.name} — ${appConfig.marketing.title}`,
  description: appConfig.marketing.description
};

const SAMPLE_CLINICS = [
  {
    slug: "derma-house",
    name: "Derma House",
    district: "SBD",
    focus: "Acne care, laser, skin rejuvenation",
    services: ["Hydrafacial", "Laser toning", "Acne program"]
  },
  {
    slug: "lumi-clinic",
    name: "Lumi Clinic",
    district: "HUD",
    focus: "Injectables, facial programs, premium consultation",
    services: ["Skin booster", "Jawline contour", "Consultation"]
  },
  {
    slug: "pure-aesthetics",
    name: "Pure Aesthetics",
    district: "BZD",
    focus: "Peel, glow care, membership packages",
    services: ["Peel therapy", "Monthly glow pack", "Hydrafacial"]
  }
] as const;

const USER_JOURNEYS = [
  {
    title: "Эмнэлэг хайх нь хялбар",
    description: "Дүүрэг, үйлчилгээ, үнэ ба clinic profile-оор хурдан харьцуулж өөрт тохирох газраа олно."
  },
  {
    title: "Сул цагийг шууд харах",
    description: "Үйлчилгээ сонгоод ойрын боломжит цагуудыг харан, provider эсвэл салбараар нарийсгаж болно."
  },
  {
    title: "Багц, хямдрал алдахгүй",
    description: "Starter pack, seasonal offer, membership зэрэг саналуудыг нэг нүүрнээс олно."
  }
];

const SMART_SIGNALS = [
  "AI-style guided discovery",
  "Real-time slot oriented booking",
  "Үнэ ба үйлчилгээний ил тод байдал"
];

const SLOT_PREVIEW = [
  { time: "Өнөөдөр · 14:30", label: "Hydrafacial", meta: "SBD · 45 мин" },
  { time: "Маргааш · 11:00", label: "Acne consult", meta: "HUD · Doctor consult" },
  { time: "Баасан · 18:15", label: "Laser toning", meta: "BZD · After-work slot" }
];

const DEAL_CARDS = [
  {
    title: "Анхны үзлэг + арьсны оношилгоо",
    price: "49,000₮-с",
    description: "Эхний удаа ирж буй хэрэглэгчдэд зориулсан entry package."
  },
  {
    title: "Glow membership bundle",
    price: "149,000₮/сар",
    description: "Сарын тогтмол арчилгаа, priority booking, бонус хөнгөлөлт."
  },
  {
    title: "Weekend express facial",
    price: "79,000₮",
    description: "Амралтын өдрийн хурдан үйлчилгээ, 60 минутын дотор."
  }
];

const BOOKING_STEPS = [
  "Эмнэлэг эсвэл үйлчилгээ хайна",
  "Үнэ, provider, салбар, сул цагийг харьцуулна",
  "Тохирох цагаа сонгоод хүсэлт илгээнэ"
];

type HomeClinicCard = {
  slug: string;
  name: string;
  district: string;
  focus: string;
  services: string[];
  serviceCount: number;
};

async function loadHighlightedClinics(): Promise<{
  clinics: HomeClinicCard[];
  fallback: boolean;
}> {
  try {
    const clinics = await getPublicClinics(6);
    if (clinics.length === 0) {
      return {
        clinics: SAMPLE_CLINICS.map((clinic) => ({
          slug: clinic.slug,
          name: clinic.name,
          district: clinic.district,
          focus: clinic.focus,
          services: [...clinic.services],
          serviceCount: clinic.services.length
        })),
        fallback: true
      };
    }

    return {
      clinics: clinics.map((clinic, index) => ({
        slug: clinic.slug,
        name: clinic.name,
        district: SAMPLE_CLINICS[index % SAMPLE_CLINICS.length]?.district ?? "Ulaanbaatar",
        focus:
          clinic.serviceNames.length > 0
            ? clinic.serviceNames.join(", ")
            : "Skin care, injectables, consultation",
        services:
          clinic.serviceNames.length > 0 ? clinic.serviceNames : [...SAMPLE_CLINICS[index % SAMPLE_CLINICS.length].services],
        serviceCount: clinic.serviceCount
      })),
      fallback: false
    };
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      return {
        clinics: SAMPLE_CLINICS.map((clinic) => ({
          slug: clinic.slug,
          name: clinic.name,
          district: clinic.district,
          focus: clinic.focus,
          services: [...clinic.services],
          serviceCount: clinic.services.length
        })),
        fallback: true
      };
    }
    throw error;
  }
}

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const organization = await getCurrentUserOrganization(user.id);
    if (!organization) {
      redirect("/setup-organization");
    }
    redirect("/dashboard");
  }

  const { clinics, fallback } = await loadHighlightedClinics();

  return (
    <main className="consumer-home">
      <section className="consumer-hero">
        <header className="marketing-topbar" role="banner">
          <div className="marketing-shell marketing-topbar__inner">
            <Link href="/" className="marketing-brand" aria-label={`${appConfig.name} нүүр`}>
              <span className="consumer-brand-mark">{appConfig.name}</span>
            </Link>

            <nav className="marketing-nav" aria-label="Нүүр navigation">
              <a href="#discover">Хайлт</a>
              <a href="#clinics">Эмнэлгүүд</a>
              <a href="#offers">Багц</a>
              <Link href="/pricing">Үнэ</Link>
            </nav>

            <div className="marketing-topbar__actions">
              <Link href="/login" className="ui-button ui-button--outline-white ui-button--sm">
                Нэвтрэх
              </Link>
              <Link href="/login" className="ui-button ui-button--hero-primary ui-button--sm">
                Clinic нээх
              </Link>
            </div>
          </div>
        </header>

        <div className="marketing-shell consumer-hero__inner">
          <div className="consumer-hero__copy">
            <span className="marketing-eyebrow">Энгийн хэрэглэгчдэд зориулсан шинэ нүүр</span>
            <h1 className="display-heading">Эмнэлэг хайж, сул цагаа олж, үнэ багцаа нэг дороос шийдээрэй.</h1>
            <p className="consumer-hero__lead">
              UbBeauty-ийн нүүр хуудсыг marketplace-first загварт шилжүүлж, хэрэглэгч эмнэлэг хайх, ойрын сул цаг
              үзэх, хямдралтай багц олох, шууд захиалга эхлүүлэх урсгалыг хамгийн урд тавилаа.
            </p>

            <div className="marketing-actions">
              <Link href="/clinics" className="ui-button ui-button--hero-primary ui-button--lg">
                Эмнэлэг хайж эхлэх
              </Link>
              <a href="#offers" className="ui-button ui-button--outline-white ui-button--lg">
                Хямдрал, багц үзэх
              </a>
            </div>

            <ul className="marketing-hero__highlights" aria-label="Гол урсгалууд">
              {SMART_SIGNALS.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </div>

          <div className="consumer-search-panel">
            <div className="consumer-search-panel__header">
              <div>
                <p className="consumer-panel-label">Smart discovery</p>
                <strong>Хэрэглэгчийн зорилгоор эхэлдэг нүүр</strong>
              </div>
              <span className="consumer-live-badge">Live preview</span>
            </div>

            <div className="consumer-search-box" aria-label="Search preview">
              <span>Hydrafacial, acne consult, laser toning...</span>
              <Link href="/clinics">Хайх</Link>
            </div>

            <div className="consumer-filter-row">
              <span>SBD</span>
              <span>Ойрын сул цаг</span>
              <span>120,000₮ хүртэл</span>
              <span>Хямдралтай</span>
            </div>

            <div className="consumer-slot-list">
              {SLOT_PREVIEW.map((slot) => (
                <article key={slot.time} className="consumer-slot-card">
                  <div>
                    <strong>{slot.label}</strong>
                    <p>{slot.meta}</p>
                  </div>
                  <span>{slot.time}</span>
                </article>
              ))}
            </div>

            <div className="consumer-search-panel__footer">
              <p>Эмнэлэг, үйлчилгээ, provider, салбар, ойрын цагийг нэг урсгалд холбосон modern booking entry.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="discover" className="marketing-section consumer-section">
        <div className="marketing-shell">
          <div className="consumer-section__intro">
            <span className="marketing-kicker">Consumer flow</span>
            <h2>Хэрэглэгч яг юу хийх гэж байгааг нүүр дээрээс нь ойлгуулна</h2>
            <p>Одоогийн системүүдийн хамгийн үр дүнтэй pattern болох guided discovery, instant comparison, action-first layout-ийг ашиглав.</p>
          </div>

          <div className="consumer-journey-grid">
            {USER_JOURNEYS.map((item) => (
              <article key={item.title} className="ui-card consumer-journey-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="clinics" className="marketing-section consumer-section consumer-section--soft">
        <div className="marketing-shell">
          <div className="consumer-section__intro consumer-section__intro--spread">
            <div>
              <span className="marketing-kicker">Featured clinics</span>
              <h2>Ойролцоох эмнэлгүүдийг хурдан харьцуул</h2>
            </div>
            <Link href="/clinics" className="consumer-inline-link">
              Бүх эмнэлэг үзэх
            </Link>
          </div>

          {fallback ? (
            <p className="consumer-fallback-note">
              Demo preview ашиглаж байна. Clinic schema бүрэн ажиллах үед бодит эмнэлгийн жагсаалт энд автоматаар гарна.
            </p>
          ) : null}

          <div className="consumer-clinic-grid">
            {clinics.slice(0, 6).map((clinic) => (
              <article key={clinic.slug} className="ui-card consumer-clinic-card">
                <div className="consumer-clinic-card__top">
                  <div>
                    <h3>{clinic.name}</h3>
                    <p>{clinic.district}</p>
                  </div>
                  <span>{clinic.serviceCount}+ үйлчилгээ</span>
                </div>

                <p className="consumer-clinic-card__focus">{clinic.focus}</p>

                <div className="consumer-chip-row">
                  {clinic.services.slice(0, 3).map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>

                <div className="consumer-clinic-card__actions">
                  <Link href={`/clinics/${clinic.slug}`} className="ui-button ui-button--secondary ui-button--sm">
                    Дэлгэрэнгүй
                  </Link>
                  <Link href={`/book/${clinic.slug}`} className="ui-button ui-button--primary ui-button--sm">
                    Сул цаг харах
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="offers" className="marketing-section consumer-section">
        <div className="marketing-shell consumer-split-layout">
          <div className="consumer-section__intro">
            <span className="marketing-kicker">Offers & bundles</span>
            <h2>Үнэ, багц, хямдралыг decision хийхэд ойрхон байрлуулна</h2>
            <p>Хэрэглэгчид ихэвчлэн эхлээд итгэл, дараа нь үнэ, дараа нь сул цаг хардаг. Тиймээс энэ гурвыг нэг дэлгэц дээр холболоо.</p>
          </div>

          <div className="consumer-offer-stack">
            {DEAL_CARDS.map((offer) => (
              <article key={offer.title} className="ui-card consumer-offer-card">
                <div>
                  <h3>{offer.title}</h3>
                  <p>{offer.description}</p>
                </div>
                <strong>{offer.price}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section consumer-section consumer-section--soft">
        <div className="marketing-shell consumer-process">
          <div className="consumer-section__intro">
            <span className="marketing-kicker">Booking flow</span>
            <h2>3 алхамтай, friction багатай урсгал</h2>
          </div>

          <div className="consumer-steps-grid">
            {BOOKING_STEPS.map((step, index) => (
              <article key={step} className="ui-card consumer-step-card">
                <span>{index + 1}</span>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section consumer-final">
        <div className="marketing-shell consumer-final__card">
          <div>
            <span className="marketing-kicker">Next action</span>
            <h2>Нүүр хуудсаа хэрэглэгчид төвтэй болгосны дараах гол CTA</h2>
            <p>Хэрэглэгчид clinic marketplace руу, харин бизнес хэрэглэгчид admin login руу тусдаа замаар орно.</p>
          </div>

          <div className="consumer-final__actions">
            <Link href="/clinics" className="ui-button ui-button--hero-primary ui-button--lg">
              Эмнэлэг хайх
            </Link>
            <Link href="/login" className="ui-button ui-button--secondary ui-button--lg">
              Clinic owner нэвтрэх
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
