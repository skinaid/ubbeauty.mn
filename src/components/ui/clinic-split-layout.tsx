"use client";

/**
 * ClinicSplitLayout
 * -----------------
 * Reusable full-height split layout used by all /clinic/* manage pages.
 *
 * Structure:
 *   ┌─────────────────────────────────────────────┐
 *   │ Header (← Back + title + subtitle)           │
 *   ├──────────────────────┬──────────────────────┤
 *   │ Left panel           │ Right panel           │
 *   │ (scrolls internally) │ (scrolls internally)  │
 *   └──────────────────────┴──────────────────────┘
 *
 * On mobile: tab switcher replaces the side-by-side layout.
 *
 * Usage:
 *   <ClinicSplitLayout
 *     backHref="/clinic"
 *     title="Байршил"
 *     subtitle="Салбар болон хаягийн тохиргоо"
 *     leftPanel={<LocationsMapPanel ... />}
 *     rightPanel={<LocationsChatPanel ... />}
 *     leftTabLabel="🗺️ Салбарууд"
 *     rightTabLabel="💬 AI нэмэх"
 *   />
 */

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

type Tab = "left" | "right";

type Props = {
  backHref?: string;
  title: string;
  subtitle?: string;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  leftTabLabel?: string;
  rightTabLabel?: string;
  /** Optional controlled tab (for external tab switching) */
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
};

export function ClinicSplitLayout({
  backHref = "/clinic",
  title,
  subtitle,
  leftPanel,
  rightPanel,
  leftTabLabel = "Жагсаалт",
  rightTabLabel = "✦ AI",
  activeTab: controlledTab,
  onTabChange,
}: Props) {
  const [internalTab, setInternalTab] = useState<Tab>("left");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: Tab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="clinic-split-root">
      {/* ── Header ── */}
      <div className="clinic-split-header">
        <Link href={backHref} className="clinic-split-back">← Буцах</Link>
        <div className="clinic-split-header__titles">
          <h1 className="clinic-split-header__title">{title}</h1>
          {subtitle && <p className="clinic-split-header__subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* ── Desktop: side-by-side ── */}
      <div className="clinic-split-desktop">
        <div className="clinic-split-panel clinic-split-panel--left">
          {leftPanel}
        </div>
        <div className="clinic-split-panel clinic-split-panel--right">
          {rightPanel}
        </div>
      </div>

      {/* ── Mobile: tab switcher ── */}
      <div className="clinic-split-mobile">
        <div className="clinic-split-tabs">
          {(["left", "right"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`clinic-split-tab${activeTab === tab ? " clinic-split-tab--active" : ""}`}
            >
              {tab === "left" ? leftTabLabel : rightTabLabel}
            </button>
          ))}
        </div>
        <div className="clinic-split-tab-content">
          {activeTab === "left" ? leftPanel : rightPanel}
        </div>
      </div>
    </div>
  );
}
