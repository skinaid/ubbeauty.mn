"use client";
import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
import { ServicesListPanel } from "@/components/clinic/services-list-panel";
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

  const handleServiceUpdate = (updated: Service) => {
    setServices((prev) =>
      prev.some((s) => s.id === updated.id)
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [...prev, updated]
    );
  };

  const handleServiceDelete = (id: string) =>
    setServices((prev) => prev.filter((s) => s.id !== id));

  return (
    <ClinicSplitLayout
      title="Үйлчилгээ"
      subtitle="Booking болон POS-д харагдах үйлчилгээний жагсаалт"
      leftTabLabel={`💆 Үйлчилгээ (${services.length})`}
      rightTabLabel="💬 AI нэмэх"
      leftPanel={
        <ServicesListPanel
          services={services}
          categories={initialCategories}
          onDelete={handleServiceDelete}
        />
      }
      rightPanel={
        <ServicesChatPanel
          orgId={orgId}
          services={services}
          onServiceUpdate={handleServiceUpdate}
          onServiceDelete={handleServiceDelete}
        />
      }
    />
  );
}
