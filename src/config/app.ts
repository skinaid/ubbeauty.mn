export const appConfig = {
  name: "UbBeauty",
  shortName: "UbBeauty OS",
  legalEntityName: "UbBeauty Technologies",
  supportEmail: "support@ubbeauty.mn",
  websiteHost: "ubbeauty.mn",
  locale: "mn",
  marketing: {
    title: "Арьс гоо заслын эмнэлгийн нэгдсэн SaaS систем",
    description:
      "Clinic profile, онлайн цаг захиалга, patient CRM, treatment record, billing ба POS-ийг нэг урсгалд холбосон operating system."
  }
} as const;

export function getSupportEmailHref(): string {
  return `mailto:${appConfig.supportEmail}`;
}
