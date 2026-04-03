import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getBrandManager, getBrandKnowledgeSections } from "@/modules/brand-managers/actions";
import { TrainingWizard } from "@/components/brand-managers/training-wizard";
import { SECTION_ORDER } from "@/modules/brand-managers/types";

type Props = { params: Promise<{ id: string }> };

export default async function TrainPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  const [bm, sections] = await Promise.all([
    getBrandManager(id),
    getBrandKnowledgeSections(id),
  ]);

  if (!bm) notFound();

  // Find first incomplete section
  const sectionMap = Object.fromEntries(sections.map((s) => [s.section_type, s]));
  const firstIncomplete = SECTION_ORDER.find((st) => !sectionMap[st]?.is_complete) ?? SECTION_ORDER[0];

  return (
    <TrainingWizard
      brandManager={bm}
      sections={sections}
      initialSection={firstIncomplete}
    />
  );
}
