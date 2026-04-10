"use client";
import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
import { ServicesListPanel } from "@/components/clinic/services-list-panel";
import { ServiceDetailPanel } from "@/components/clinic/service-detail-panel";
import { ServicesChatPanel } from "@/components/clinic/services-chat-panel";
import type { ServiceRecord, ServiceCategory } from "@/modules/clinic/service-types";

export function ServicesPageClient({
  initialServices,
  initialCategories,
  orgId,
}: {
  initialServices: ServiceRecord[];
  initialCategories: ServiceCategory[];
  orgId: string;
}) {
  const [services, setServices] = useState<ServiceRecord[]>(initialServices);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);

  const handleServiceUpdate = (updated: ServiceRecord) => {
    setServices((prev) =>
      prev.some((s) => s.id === updated.id)
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [...prev, updated]
    );
    // AI chat-аар хадгалахад detail panel-д шууд тусна
    setSelectedService((prev) => prev?.id === updated.id ? updated : prev);
  };

  const handleServiceDelete = (id: string) =>
    setServices((prev) => prev.filter((s) => s.id !== id));

  return (
    <ClinicSplitLayout
      title="Үйлчилгээ"
      subtitle="Booking болон POS-д харагдах үйлчилгээний жагсаалт"
      leftTabLabel={selectedService ? `💆 ${selectedService.name}` : `💆 Үйлчилгээ (${services.length})`}
      rightTabLabel="💬 AI нэмэх"
      leftPanel={
        selectedService ? (
          <ServiceDetailPanel
            service={selectedService}
            categories={initialCategories}
            onBack={() => setSelectedService(null)}
            onUpdate={(updated) => {
              handleServiceUpdate(updated);
              setSelectedService(updated);
            }}
            onDelete={(id) => {
              handleServiceDelete(id);
              setSelectedService(null);
            }}
          />
        ) : (
          <ServicesListPanel
            services={services}
            categories={initialCategories}
            onDelete={handleServiceDelete}
            onSelect={setSelectedService}
          />
        )
      }
      rightPanel={
        <ServicesChatPanel
          orgId={orgId}
          services={services}
          onServiceUpdate={handleServiceUpdate}
          onServiceDelete={handleServiceDelete}
          selectedService={selectedService}
        />
      }
    />
  );
}
