"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  type ClinicSetupActionState,
  upsertTreatmentRecordAction
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function TreatmentRecordForm({
  appointmentId,
  defaults
}: {
  appointmentId: string;
  defaults?: {
    subjectiveNotes?: string | null;
    objectiveNotes?: string | null;
    assessmentNotes?: string | null;
    planNotes?: string | null;
    contraindications?: string | null;
    followUpPlan?: string | null;
    followUpOutcome?: string | null;
    complicationNotes?: string | null;
    consentArtifactUrl?: string | null;
    beforePhotoUrl?: string | null;
    afterPhotoUrl?: string | null;
    beforeAfterAssetNotes?: string | null;
    consentConfirmed?: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(upsertTreatmentRecordAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <input type="hidden" name="appointmentId" value={appointmentId} />

      <div>
        <label className="ui-label" htmlFor={`subjective-${appointmentId}`}>
          Subjective note
        </label>
        <textarea
          id={`subjective-${appointmentId}`}
          name="subjectiveNotes"
          className="ui-input"
          rows={3}
          defaultValue={defaults?.subjectiveNotes ?? ""}
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`objective-${appointmentId}`}>
          Objective note
        </label>
        <textarea
          id={`objective-${appointmentId}`}
          name="objectiveNotes"
          className="ui-input"
          rows={3}
          defaultValue={defaults?.objectiveNotes ?? ""}
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`assessment-${appointmentId}`}>
          Assessment
        </label>
        <textarea
          id={`assessment-${appointmentId}`}
          name="assessmentNotes"
          className="ui-input"
          rows={3}
          defaultValue={defaults?.assessmentNotes ?? ""}
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`plan-${appointmentId}`}>
          Plan
        </label>
        <textarea
          id={`plan-${appointmentId}`}
          name="planNotes"
          className="ui-input"
          rows={3}
          defaultValue={defaults?.planNotes ?? ""}
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`contra-${appointmentId}`}>
          Contraindications
        </label>
        <Input
          id={`contra-${appointmentId}`}
          name="contraindications"
          defaultValue={defaults?.contraindications ?? ""}
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`followup-${appointmentId}`}>
          Follow-up plan
        </label>
        <textarea
          id={`followup-${appointmentId}`}
          name="followUpPlan"
          className="ui-input"
          rows={3}
          defaultValue={defaults?.followUpPlan ?? ""}
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`followup-outcome-${appointmentId}`}>
          Follow-up outcome
        </label>
        <textarea
          id={`followup-outcome-${appointmentId}`}
          name="followUpOutcome"
          className="ui-input"
          rows={2}
          defaultValue={defaults?.followUpOutcome ?? ""}
          placeholder="24h follow-up OK, redness reduced, no adverse event..."
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`complication-${appointmentId}`}>
          Complication notes
        </label>
        <textarea
          id={`complication-${appointmentId}`}
          name="complicationNotes"
          className="ui-input"
          rows={2}
          defaultValue={defaults?.complicationNotes ?? ""}
          placeholder="Unexpected irritation, swelling, escalation needed..."
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`consent-artifact-${appointmentId}`}>
          Consent artifact URL / reference
        </label>
        <Input
          id={`consent-artifact-${appointmentId}`}
          name="consentArtifactUrl"
          defaultValue={defaults?.consentArtifactUrl ?? ""}
          placeholder="https://... or internal file reference"
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`before-photo-${appointmentId}`}>
          Before evidence URL
        </label>
        <Input
          id={`before-photo-${appointmentId}`}
          name="beforePhotoUrl"
          defaultValue={defaults?.beforePhotoUrl ?? ""}
          placeholder="https://...before.jpg"
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`after-photo-${appointmentId}`}>
          After evidence URL
        </label>
        <Input
          id={`after-photo-${appointmentId}`}
          name="afterPhotoUrl"
          defaultValue={defaults?.afterPhotoUrl ?? ""}
          placeholder="https://...after.jpg"
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`evidence-notes-${appointmentId}`}>
          Before / after evidence notes
        </label>
        <textarea
          id={`evidence-notes-${appointmentId}`}
          name="beforeAfterAssetNotes"
          className="ui-input"
          rows={2}
          defaultValue={defaults?.beforeAfterAssetNotes ?? ""}
          placeholder="Lighting, angle, findings, comparison notes..."
        />
      </div>

      <label className="ui-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="checkbox"
          name="consentConfirmed"
          defaultChecked={defaults?.consentConfirmed ?? false}
        />
        Consent confirmed
      </label>

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Хадгалж байна..." : "Treatment record хадгалах"}
      </Button>

      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
