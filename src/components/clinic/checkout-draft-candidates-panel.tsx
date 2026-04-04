"use client";

import { useActionState, useMemo, useState } from "react";
import { CreateCheckoutDraftButton } from "@/components/clinic/create-checkout-draft-button";
import { Button, Card } from "@/components/ui";
import { createBulkCheckoutDraftsAction } from "@/modules/clinic/actions";

type DraftCandidate = {
  id: string;
  patient?: { full_name?: string | null } | null;
  service?: { name?: string | null } | null;
  service_id?: string | null;
  scheduled_start: string;
};

export function CheckoutDraftCandidatesPanel({
  candidates
}: {
  candidates: DraftCandidate[];
}) {
  const [state, formAction, pending] = useActionState(createBulkCheckoutDraftsAction, {});
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (!normalized) return true;
      return (
        (candidate.patient?.full_name ?? "").toLowerCase().includes(normalized) ||
        (candidate.service?.name ?? candidate.service_id ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [candidates, query]);

  const toggleSelected = (candidateId: string) => {
    setSelectedIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId]
    );
  };

  const selectVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const candidate of filteredCandidates) {
        next.add(candidate.id);
      }
      return Array.from(next);
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return (
    <Card padded stack className="checkout-print-hidden">
      <h2 className="ui-section-title" style={{ marginTop: 0 }}>
        Draft candidates
      </h2>

      <div className="ui-form-stack" style={{ gap: "0.55rem" }}>
        <input
          id="checkout-draft-search"
          className="ui-input"
          placeholder="Patient эсвэл service хайх"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <Button type="button" variant="ghost" size="sm" onClick={selectVisible}>
              Visible select
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
          <span className="ui-text-muted">{selectedIds.length} сонгогдсон</span>
        </div>

        <form action={formAction} className="ui-form-stack" style={{ gap: "0.45rem" }}>
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="appointmentIds" value={id} />
          ))}
          <Button type="submit" variant="primary" size="sm" disabled={pending || selectedIds.length === 0}>
            {pending ? "Үүсгэж байна..." : "Сонгосноос draft үүсгэх"}
          </Button>
          {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
          {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
        </form>
      </div>

      {filteredCandidates.length === 0 ? (
        <p style={{ margin: 0 }}>Тохирох completed visit олдсонгүй.</p>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="ui-card ui-card--padded ui-card--stack">
              <label style={{ display: "flex", gap: "0.75rem", alignItems: "start" }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(candidate.id)}
                  onChange={() => toggleSelected(candidate.id)}
                  style={{ marginTop: "0.2rem" }}
                />
                <span style={{ display: "grid", gap: "0.25rem", flex: 1 }}>
                  <strong>{candidate.patient?.full_name ?? "Patient"}</strong>
                  <span className="ui-text-muted">
                    {candidate.service?.name ?? candidate.service_id} ·{" "}
                    {new Date(candidate.scheduled_start).toLocaleString("mn-MN")}
                  </span>
                </span>
              </label>
              <CreateCheckoutDraftButton appointmentId={candidate.id} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
