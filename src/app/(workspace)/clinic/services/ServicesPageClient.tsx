"use client";
import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
import { ServicesListPanel } from "@/components/clinic/services-list-panel";
import { ServiceDetailPanel } from "@/components/clinic/service-detail-panel";
import { ServicesChatPanel } from "@/components/clinic/services-chat-panel";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_from: number;
  currency: string;
  is_bookable: boolean;
  status: string;
  location_id: string | null;
  category_id: string | null;
};

type Category = { id: string; name: string; slug: string; sort_order: number };

export function ServicesPageClient({
  initialServices,
  initialCategories,
  orgId,
}: {
  initialServices: Service[];
  initialCategories: Category[];
  orgId: string;
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleServiceUpdate = (updated: Service) => {
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
