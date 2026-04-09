"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  managePatientFollowUpAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function PatientFollowUpActions({
  patientId,
  currentLifecycleStage,
  currentOwnerId,
  staffOptions
}: {
  patientId: string;
  currentLifecycleStage?: string | null;
  currentOwnerId?: string | null;
  staffOptions: Array<{ id: string; full_name: string }>;
}) {
  const [state, formAction, pending] = useActionState(managePatientFollowUpAction, initialState);

  return (
    <form
      action={formAction}
      className="ui-form-stack"
      style={{ gap: "0.5rem" }}
      data-smoke-form="patient-follow-up"
      data-patient-id={patientId}
    >
      <input type="hidden" name="patientId" value={patientId} />

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button type="submit" name="operation" value="complete" variant="secondary" size="sm" disabled={pending}>
          {pending ? "..." : "Complete"}
        </Button>
        <Button type="submit" name="operation" value="snooze_3d" variant="ghost" size="sm" disabled={pending}>
          {pending ? "..." : "Snooze 3d"}
        </Button>
        <Button type="submit" name="operation" value="snooze_7d" variant="ghost" size="sm" disabled={pending}>
          {pending ? "..." : "Snooze 7d"}
        </Button>
      </div>

      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <select
          className="ui-input"
          name="followUpOwnerId"
          defaultValue={currentOwnerId ?? ""}
          data-smoke-field="follow-up-owner"
        >
          <option value="">No owner</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name}
            </option>
          ))}
        </select>
        <Button type="submit" name="operation" value="assign_owner" variant="ghost" size="sm" disabled={pending}>
          Assign owner
        </Button>
      </div>

      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <select
          className="ui-input"
          name="lifecycleStage"
          defaultValue={currentLifecycleStage ?? "active"}
          data-smoke-field="lifecycle-stage"
        >
          <option value="new_lead">New lead</option>
          <option value="consulted">Consulted</option>
          <option value="active">Active</option>
          <option value="follow_up_due">Follow-up due</option>
          <option value="at_risk">At risk</option>
          <option value="vip">VIP</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" name="operation" value="update_stage" variant="ghost" size="sm" disabled={pending}>
          Update stage
        </Button>
      </div>

      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
