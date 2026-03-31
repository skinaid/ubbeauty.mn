import Link from "next/link";
import type { BrandKnowledgeSection, SectionType } from "@/modules/brand-managers/types";

type SectionRow = {
  type: SectionType;
  meta: { label: string; description: string; emoji: string };
  data: BrandKnowledgeSection | null;
};

type Props = {
  brandManagerId: string;
  sections: SectionRow[];
};

export function KnowledgeSectionList({ brandManagerId, sections }: Props) {
  return (
    <div className="bm-sections">
      {sections.map((s) => {
        const score = s.data?.completeness_score ?? 0;
        const complete = s.data?.is_complete ?? false;
        return (
          <Link
            key={s.type}
            href={`/brand-managers/${brandManagerId}/train?section=${s.type}`}
            className={`bm-section-row${complete ? " bm-section-row--complete" : ""}`}
          >
            <span className="bm-section-row__emoji">{s.meta.emoji}</span>
            <div className="bm-section-row__info">
              <span className="bm-section-row__label">{s.meta.label}</span>
              <span className="bm-section-row__desc">{s.meta.description}</span>
            </div>
            <div className="bm-section-row__right">
              <div className="bm-section-row__bar">
                <div
                  className="bm-section-row__fill"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="bm-section-row__pct">{score}%</span>
              {complete && <span className="bm-section-row__check">✅</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
