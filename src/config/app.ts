export const appConfig = {
  name: "MarTech",
  shortName: "MarTech MVP",
  legalEntityName: "MarTech Mongolia",
  supportEmail: "support@martech.mn",
  websiteHost: "martech.mn",
  locale: "mn",
  marketing: {
    title: "Facebook Page analytics ба AI зөвлөмж",
    description:
      "Facebook Page-ээ холбоод үзүүлэлтээ нэг дор харж, AI-аас ойлгомжтой дүгнэлт болон хэрэгжүүлэхүйц зөвлөмж аваарай."
  }
} as const;

export function getSupportEmailHref(): string {
  return `mailto:${appConfig.supportEmail}`;
}
