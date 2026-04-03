import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

export const metadata: Metadata = {
  title: `${appConfig.name} — ${appConfig.marketing.title}`,
  description: appConfig.marketing.description
};

const FEATURE_BLOCKS = [
  {
    title: "Online booking + clinic microsite",
    description: "Эмнэлэг бүр public profile, service menu, booking funnel-тэй байна."
  },
  {
    title: "Patient CRM",
    description: "Patient profile, visit history, notes, follow-up ажиллагааг нэг master record дээр хадгална."
  },
  {
    title: "Treatment workflow",
    description: "Consultation, consent, treatment note, before/after evidence-г бүтэцтэй удирдана."
  },
  {
    title: "Billing & POS",
    description: "Appointment completion-оос checkout draft үүсгэж, төлбөрийг clinic workflow-тэй холбодог."
  }
];

const OPERATING_STEPS = [
  "Clinic owner бүртгүүлж profile, staff, service-ээ тохируулна.",
  "Public clinic page-аас patient appointment захиална.",
  "Front desk календарь дээр баталгаажуулж, treatment visit-д бэлдэнэ.",
  "Visit дуусмагц treatment record ба checkout-оо нэг урсгалд хаана."
];

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const organization = await getCurrentUserOrganization(user.id);
    if (!organization) {
      redirect("/setup-organization");
    }
    redirect("/dashboard");
  }

  return (
    <main className="marketing-home">
      <div className="marketing-hero">
        <header className="marketing-topbar" role="banner">
          <div className="marketing-shell marketing-topbar__inner">
            <Link href="/" className="marketing-brand" aria-label={`${appConfig.name} нүүр`}>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>
                {appConfig.name}
              </span>
            </Link>

            <nav className="marketing-nav" aria-label="Нүүр хуудсын navigation">
              <a href="#features">Боломжууд</a>
              <a href="#workflow">Workflow</a>
              <Link href="/clinics">Clinics</Link>
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

        <div className="marketing-hero__inner">
          <div className="marketing-shell marketing-hero__grid">
            <div className="marketing-hero__copy">
              <span className="marketing-eyebrow">UbBeauty OS</span>
              <h1 className="display-heading">
                Арьс гоо заслын эмнэлгийн
                <br />
                нэгдсэн operating system.
              </h1>
              <p className="marketing-hero__lead">
                Public clinic profile, онлайн цаг захиалга, patient CRM, treatment record, billing ба POS-ийг нэг
                урсгалд холбож өдөр тутмын ажиллагааг хялбарчилна.
              </p>
              <div className="marketing-actions">
                <Link href="/login" className="ui-button ui-button--hero-primary ui-button--lg">
                  Admin workspace эхлүүлэх
                </Link>
                <Link href="/clinics" className="ui-button ui-button--outline-white ui-button--lg">
                  Clinics үзэх
                </Link>
              </div>
              <ul className="marketing-hero__highlights" aria-label="Гол давуу талууд">
                <li>Appointment-led workflow</li>
                <li>Patient CRM + treatment history</li>
                <li>Checkout, invoice, POS нэг урсгалд</li>
              </ul>
            </div>

            <div className="marketing-preview">
              <div className="marketing-preview__chrome" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="marketing-preview__header">
                <div>
                  <strong>Clinic operations preview</strong>
                  <p>Front desk, provider, billing баг нэг dashboard-аас ажиллана.</p>
                </div>
                <span className="marketing-status">MVP 1</span>
              </div>

              <div className="marketing-metrics">
                <article className="marketing-metric-card">
                  <span>Today appointments</span>
                  <strong>24</strong>
                  <small>Confirmed + arrived</small>
                </article>
                <article className="marketing-metric-card">
                  <span>Active patients</span>
                  <strong>318</strong>
                  <small>90-day activity window</small>
                </article>
                <article className="marketing-metric-card">
                  <span>Checkout queue</span>
                  <strong>6</strong>
                  <small>Visit completed, payment pending</small>
                </article>
              </div>

              <div className="marketing-insight ui-card">
                <div className="marketing-insight__meta">
                  <p className="marketing-insight__label">Operating model</p>
                  <span className="marketing-insight__badge">Clinic + marketplace</span>
                </div>
                <p className="marketing-insight__text">
                  Эмнэлэг бүр өөрийн public page-тэй, харин staff scheduling, patient records, treatment notes,
                  төлбөрийн урсгал нь private workspace дотор удирдагдана.
                </p>
                <ul>
                  <li>Microsite дээрээс appointment авна</li>
                  <li>Calendar дээр visit-г баталгаажуулна</li>
                  <li>Treatment ба POS checkout-оор хаана</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="features" className="marketing-section" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        <div className="marketing-shell">
          <div className="marketing-section__intro">
            <span className="marketing-kicker">MVP 1 foundation</span>
            <h2>Clinic-ийн өдөр тутмын урсгалыг нэгтгэнэ</h2>
          </div>
          <div className="marketing-card-grid">
            {FEATURE_BLOCKS.map((feature) => (
              <article key={feature.title} className="ui-card marketing-feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="marketing-section marketing-section--soft">
        <div className="marketing-shell">
          <div className="marketing-section__intro">
            <span className="marketing-kicker">Workflow</span>
            <h2>Яаж ажиллах вэ?</h2>
          </div>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {OPERATING_STEPS.map((step, index) => (
              <article key={step} className="ui-card marketing-feature-card">
                <h3>{index + 1}. Алхам</h3>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
