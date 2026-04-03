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
  const baseSuggestions = useMemo(
    () => (selectedServiceId ? slotSuggestionsByService[selectedServiceId] ?? [] : []),
    [selectedServiceId, slotSuggestionsByService]
  );
  const activeSuggestions = liveSuggestions.length > 0 || preferredStaffId || preferredLocationId
    ? liveSuggestions
    : baseSuggestions;

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
    <form action={formAction} className="ui-form-stack ui-card ui-card--padded ui-card--stack">
      <input type="hidden" name="clinicSlug" value={clinicSlug} />

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

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
          <div className="ui-text-muted" style={{ marginTop: "0.45rem", display: "grid", gap: "0.4rem" }}>
            <strong style={{ fontSize: "var(--text-xs)" }}>
              Suggested slots{loadingSlots ? " · шинэчилж байна..." : ""}
            </strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
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
                    {new Date(slot).toLocaleString("mn-MN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : selectedServiceId ? (
          <p className="ui-text-muted" style={{ marginTop: "0.45rem" }}>
            {loadingSlots ? "Сул цаг хайж байна..." : "Санал болгох slot одоогоор алга байна. Өөр provider/location эсвэл өөр цаг туршина уу."}
          </p>
        ) : null}
      </div>

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

      <Button type="submit" variant="primary" disabled={pending || services.length === 0}>
        {pending ? "Илгээж байна..." : "Цаг захиалах хүсэлт илгээх"}
      </Button>

      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
