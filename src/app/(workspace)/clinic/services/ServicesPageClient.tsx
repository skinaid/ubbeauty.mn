"use client";
import { useState } from "react";
import { ServicesListPanel } from "@/components/clinic/services-list-panel";
import { ServicesChatPanel } from "@/components/clinic/services-chat-panel";

type Service = {
  id: string; name: string; description: string | null;
  duration_minutes: number; price_from: number; currency: string;
  is_bookable: boolean; status: string; location_id: string | null; category_id: string | null;
};
type Tab = "list" | "chat";

export function ServicesPageClient({ initialServices, orgId }: { initialServices: Service[]; orgId: string }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [activeTab, setActiveTab] = useState<Tab>("list");

  const handleServiceUpdate = (updated: Service) => {
    setServices((prev) => prev.some((s) => s.id === updated.id) ? prev.map((s) => s.id === updated.id ? updated : s) : [...prev, updated]);
    setActiveTab("list");
  };
  const handleServiceDelete = (id: string) => setServices((prev) => prev.filter((s) => s.id !== id));

  return (
    <>
      <style>{`
        @media (min-width: 769px) { .svc-desktop { display: grid !important; } .svc-mobile { display: none !important; } }
        @media (max-width: 768px) { .svc-desktop { display: none !important; } .svc-mobile { display: flex !important; } }
      `}</style>
      {/* Desktop */}
      <div className="svc-desktop" style={{ gridTemplateColumns: "1fr 1fr", gap: 0, flex: 1, overflow: "hidden", minHeight: 0, display: "none" }}>
        <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
          <ServicesListPanel services={services} onDelete={handleServiceDelete} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ServicesChatPanel orgId={orgId} services={services} onServiceUpdate={handleServiceUpdate} />
        </div>
      </div>
      {/* Mobile */}
      <div className="svc-mobile" style={{ display: "none", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
          {(["list", "chat"] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "0.75rem", border: "none", background: "transparent", fontSize: "0.85rem", fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#111827" : "#9ca3af", borderBottom: activeTab === tab ? "2px solid #111827" : "2px solid transparent", cursor: "pointer" }}>
              {tab === "list" ? `💆 Үйлчилгээ (${services.length})` : "💬 AI нэмэх"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "list"
            ? <div style={{ flex: 1, overflowY: "auto" }}><ServicesListPanel services={services} onDelete={handleServiceDelete} /></div>
            : <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}><ServicesChatPanel orgId={orgId} services={services} onServiceUpdate={handleServiceUpdate} /></div>}
        </div>
      </div>
    </>
  );
}
