"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  type ClinicSetupActionState,
  updatePatientProfileAction
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function PatientProfileForm({
  patientId,
  notes,
  tags
}: {
  patientId: string;
  notes?: string | null;
  tags?: string[];
}) {
  const [state, formAction, pending] = useActionState(updatePatientProfileAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <input type="hidden" name="patientId" value={patientId} />

      <div>
        <label className="ui-label" htmlFor={`patient-tags-${patientId}`}>
          Tags
        </label>
        <input
          id={`patient-tags-${patientId}`}
          name="tags"
          className="ui-input"
          defaultValue={(tags ?? []).join(", ")}
          placeholder="vip, acne, follow-up, laser"
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`patient-notes-${patientId}`}>
          Internal notes
        </label>
        <textarea
          id={`patient-notes-${patientId}`}
          name="notes"
          className="ui-input"
          rows={5}
          defaultValue={notes ?? ""}
          placeholder="Consultation summary, concerns, preferred staff, caution flags..."
        />
      </div>

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {pending ? "Хадгалж байна..." : "Patient profile хадгалах"}
      </Button>

      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
