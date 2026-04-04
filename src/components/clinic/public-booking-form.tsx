"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";
import {
  createPublicBookingAction,
  type PublicBookingActionState
} from "@/modules/clinic/public-actions";
import type { ClinicLocationRow, ServiceRow, StaffMemberRow } from "@/modules/clinic/types";

const initialState: PublicBookingActionState = {};

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatSlotLabel(value: string): string {
  return new Date(value).toLocaleString("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function PublicBookingForm({
  clinicSlug,
  clinicName,
  services,
  providers,
  locations,
  slotSuggestionsByService
}: {
  clinicSlug: string;
  clinicName: string;
  services: ServiceRow[];
  providers: Pick<StaffMemberRow, "id" | "full_name" | "specialty" | "location_id">[];
  locations: Pick<ClinicLocationRow, "id" | "name" | "district" | "city">[];
  slotSuggestionsByService: Record<string, string[]>;
}) {
  const [state, formAction, pending] = useActionState(createPublicBookingAction, initialState);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [preferredStaffId, setPreferredStaffId] = useState("");
  const [preferredLocationId, setPreferredLocationId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services]
  );
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === preferredStaffId) ?? null,
    [preferredStaffId, providers]
  );
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === preferredLocationId) ?? null,
    [preferredLocationId, locations]
  );

  const baseSuggestions = useMemo(
    () => (selectedServiceId ? slotSuggestionsByService[selectedServiceId] ?? [] : []),
    [selectedServiceId, slotSuggestionsByService]
  );

  const activeSuggestions =
    liveSuggestions.length > 0 || preferredStaffId || preferredLocationId ? liveSuggestions : baseSuggestions;
  const hasSubmitted = Boolean(state.message && !state.error);

  useEffect(() => {
    let ignore = false;

    async function loadSlots() {
      if (!selectedServiceId) {
        setLiveSuggestions([]);
        return;
      }

      if (!preferredStaffId && !preferredLocationId) {
        setLiveSuggestions([]);
        return;
      }

      setLoadingSlots(true);
      const params = new URLSearchParams({ serviceId: selectedServiceId });
      if (preferredStaffId) params.set("preferredStaffId", preferredStaffId);
      if (preferredLocationId) params.set("preferredLocationId", preferredLocationId);

      try {
        const response = await fetch(`/api/public/clinics/${clinicSlug}/slots?${params.toString()}`);
        const payload = (await response.json()) as { suggestions?: string[] };
        if (!ignore) {
          setLiveSuggestions(payload.suggestions ?? []);
        }
      } catch {
        if (!ignore) {
          setLiveSuggestions([]);
        }
      } finally {
        if (!ignore) {
          setLoadingSlots(false);
        }
      }
    }

    void loadSlots();

    return () => {
      ignore = true;
    };
  }, [clinicSlug, preferredLocationId, preferredStaffId, selectedServiceId]);

  return (
    <div className="consumer-booking-form-shell">
      {hasSubmitted ? (
        <div className="ui-card consumer-booking-form" style={{ display: "grid", gap: "1rem" }}>
          <div className="consumer-booking-form__header">
            <div>
              <p className="consumer-panel-label">Booking request received</p>
              <h2>{clinicName}</h2>
            </div>
            <span className="consumer-live-badge">Амжилттай</span>
          </div>
          <p className="ui-inline-feedback ui-inline-feedback--success" style={{ margin: 0 }}>
            {state.message}
          </p>
          <div className="consumer-booking-form__summary-grid">
            <article className="consumer-provider-card">
              <strong>Сонгосон үйлчилгээ</strong>
              <p>{selectedService ? selectedService.name : "Clinic баг service-ийг баталгаажуулна"}</p>
            </article>
            <article className="consumer-provider-card">
              <strong>Хүссэн цаг</strong>
              <p>{scheduledStart ? formatSlotLabel(scheduledStart) : "Clinic баг тантай цагийг тулгана"}</p>
            </article>
          </div>
          <div className="consumer-provider-card">
            <strong>Дараа нь юу болох вэ?</strong>
            <p>Clinic баг таны хүсэлтийг шалгаад баталгаажуулах эсвэл ойролцоо сул цаг санал болгохоор холбогдоно.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Button type="button" variant="primary" size="sm" onClick={() => window.location.assign(`/clinics/${clinicSlug}`)}>
              Clinic profile руу буцах
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => window.location.assign("/clinics")}>
              Өөр эмнэлэг үзэх
            </Button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="ui-card consumer-booking-form">
          <input type="hidden" name="clinicSlug" value={clinicSlug} />

          <div className="consumer-booking-form__header">
            <div>
              <p className="consumer-panel-label">Booking request</p>
              <h2>{clinicName}</h2>
            </div>
            <span className="consumer-live-badge">{services.length} үйлчилгээ</span>
          </div>

          <div className="ui-form-stack">
            <div>
              <label className="ui-label" htmlFor="serviceId">
                Үйлчилгээ
              </label>
              <select
                id="serviceId"
                name="serviceId"
                className="ui-input"
                required
                defaultValue=""
                onChange={(event) => {
                  setSelectedServiceId(event.target.value);
                  setPreferredStaffId("");
                  setPreferredLocationId("");
                  setScheduledStart("");
                }}
              >
                <option value="" disabled>
                  Үйлчилгээ сонгоно уу
                </option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.duration_minutes} мин · {service.price_from} {service.currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="consumer-booking-form__grid">
              <div>
                <label className="ui-label" htmlFor="preferredStaffId">
                  Preferred provider
                </label>
                <select
                  id="preferredStaffId"
                  name="preferredStaffId"
                  className="ui-input"
                  value={preferredStaffId}
                  onChange={(event) => {
                    setPreferredStaffId(event.target.value);
                    setScheduledStart("");
                  }}
                >
                  <option value="">Clinic тохируулах</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.full_name}
                      {provider.specialty ? ` · ${provider.specialty}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ui-label" htmlFor="preferredLocationId">
                  Preferred location
                </label>
                <select
                  id="preferredLocationId"
                  name="preferredLocationId"
                  className="ui-input"
                  value={preferredLocationId}
                  onChange={(event) => {
                    setPreferredLocationId(event.target.value);
                    setScheduledStart("");
                  }}
                >
                  <option value="">Clinic тохируулах</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.district ? ` · ${location.district}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="ui-label" htmlFor="scheduledStart">
                Хүссэн цаг
              </label>
              <Input
                id="scheduledStart"
                name="scheduledStart"
                type="datetime-local"
                required
                value={scheduledStart}
                onChange={(event) => setScheduledStart(event.target.value)}
              />
              {activeSuggestions.length > 0 ? (
                <div className="consumer-booking-form__slot-block">
                  <strong>
                    Suggested slots{loadingSlots ? " · шинэчилж байна..." : ""}
                  </strong>
                  <div className="consumer-booking-form__slot-row">
                    {activeSuggestions.map((slot) => {
                      const localValue = toDateTimeLocalValue(slot);
                      const isSelected = scheduledStart === localValue;

                      return (
                        <Button
                          key={slot}
                          type="button"
                          size="sm"
                          variant={isSelected ? "primary" : "secondary"}
                          onClick={() => setScheduledStart(localValue)}
                        >
                          {formatSlotLabel(slot)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : selectedServiceId ? (
                <p className="consumer-fallback-note" style={{ marginTop: "0.55rem" }}>
                  {loadingSlots
                    ? "Сул цаг хайж байна..."
                    : "Санал болгох slot одоогоор алга байна. Өөр provider/location эсвэл өөр цаг туршина уу."}
                </p>
              ) : null}
            </div>

            <div className="consumer-booking-form__grid">
              <div>
                <label className="ui-label" htmlFor="fullName">
                  Нэр
                </label>
                <Input id="fullName" name="fullName" required maxLength={120} />
              </div>

              <div>
                <label className="ui-label" htmlFor="phone">
                  Утас
                </label>
                <Input id="phone" name="phone" required maxLength={40} />
              </div>
            </div>

            <div>
              <label className="ui-label" htmlFor="email">
                И-мэйл
              </label>
              <Input id="email" name="email" type="email" maxLength={120} />
            </div>

            <div>
              <label className="ui-label" htmlFor="bookingNotes">
                Тайлбар
              </label>
              <textarea
                id="bookingNotes"
                name="bookingNotes"
                className="ui-input"
                rows={4}
                placeholder={`${clinicName}-д хандаж байгаа шалтгаан, хүсэлтээ бичиж болно.`}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" disabled={pending || services.length === 0}>
              {pending ? "Илгээж байна..." : "Цаг захиалах хүсэлт илгээх"}
            </Button>

            {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
          </div>
        </form>
      )}

      <aside className="ui-card consumer-booking-form__sidebar">
        <div>
          <p className="consumer-panel-label">Selection summary</p>
          <h3>{selectedService ? selectedService.name : "Эхлээд үйлчилгээ сонгоно уу"}</h3>
          <p>
            {selectedService
              ? `${selectedService.duration_minutes} мин · ${selectedService.price_from} ${selectedService.currency}`
              : "Service сонгосны дараа үнэ, хугацаа, slot suggestion энд гарна."}
          </p>
        </div>

        <div className="consumer-booking-form__summary-grid">
          <article className="consumer-provider-card">
            <strong>Provider</strong>
            <p>{selectedProvider ? selectedProvider.full_name : "Автоматаар эсвэл дараа сонгоно"}</p>
          </article>
          <article className="consumer-provider-card">
            <strong>Салбар</strong>
            <p>{selectedLocation ? selectedLocation.name : "Clinic тохируулна"}</p>
          </article>
        </div>

        <div className="consumer-booking-form__tip-list">
          <div className="consumer-provider-card">
            <strong>1. Үйлчилгээ сонго</strong>
            <p>Тохирох service дээр тулгуурлан suggested slot гарна.</p>
          </div>
          <div className="consumer-provider-card">
            <strong>2. Нэмэлтээр нарийсга</strong>
            <p>Provider эсвэл салбар сонговол slot илүү бодитой шүүгдэнэ.</p>
          </div>
          <div className="consumer-provider-card">
            <strong>3. Хүсэлт илгээ</strong>
            <p>Clinic талд request бүртгэгдэж, баталгаажуулах урсгал эхэлнэ.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
