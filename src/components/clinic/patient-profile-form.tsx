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
  tags,
  lifecycleStage,
  allergyNotes,
  contraindicationFlags,
  preferredContactChannel,
  preferredServiceId,
  preferredStaffMemberId,
  followUpOwnerId,
  serviceOptions,
  staffOptions
}: {
  patientId: string;
  notes?: string | null;
  tags?: string[];
  lifecycleStage?: string | null;
  allergyNotes?: string | null;
  contraindicationFlags?: string | null;
  preferredContactChannel?: string | null;
  preferredServiceId?: string | null;
  preferredStaffMemberId?: string | null;
  followUpOwnerId?: string | null;
  serviceOptions: Array<{ id: string; name: string }>;
  staffOptions: Array<{ id: string; full_name: string }>;
}) {
  const [state, formAction, pending] = useActionState(updatePatientProfileAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <input type="hidden" name="patientId" value={patientId} />

      <div>
        <label className="ui-label" htmlFor={`patient-lifecycle-${patientId}`}>
          Lifecycle stage
        </label>
        <select
          id={`patient-lifecycle-${patientId}`}
          name="lifecycleStage"
          className="ui-input"
          defaultValue={lifecycleStage ?? "new_lead"}
        >
          <option value="new_lead">New lead</option>
          <option value="consulted">Consulted</option>
          <option value="active">Active</option>
          <option value="follow_up_due">Follow-up due</option>
          <option value="at_risk">At risk</option>
          <option value="vip">VIP</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label className="ui-label" htmlFor={`patient-contact-channel-${patientId}`}>
          Preferred contact channel
        </label>
        <select
          id={`patient-contact-channel-${patientId}`}
          name="preferredContactChannel"
          className="ui-input"
          defaultValue={preferredContactChannel ?? "phone"}
        >
          <option value="phone">Phone</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="any">Any</option>
        </select>
      </div>

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
        <label className="ui-label" htmlFor={`patient-preferred-service-${patientId}`}>
          Preferred service
        </label>
        <select
          id={`patient-preferred-service-${patientId}`}
          name="preferredServiceId"
          className="ui-input"
          defaultValue={preferredServiceId ?? ""}
        >
          <option value="">Not set</option>
          {serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ui-label" htmlFor={`patient-preferred-staff-${patientId}`}>
          Preferred provider
        </label>
        <select
          id={`patient-preferred-staff-${patientId}`}
          name="preferredStaffMemberId"
          className="ui-input"
          defaultValue={preferredStaffMemberId ?? ""}
        >
          <option value="">Not set</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ui-label" htmlFor={`patient-follow-up-owner-${patientId}`}>
          Follow-up owner
        </label>
        <select
          id={`patient-follow-up-owner-${patientId}`}
          name="followUpOwnerId"
          className="ui-input"
          defaultValue={followUpOwnerId ?? ""}
        >
          <option value="">Not set</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ui-label" htmlFor={`patient-allergy-notes-${patientId}`}>
          Allergy notes
        </label>
        <textarea
          id={`patient-allergy-notes-${patientId}`}
          name="allergyNotes"
          className="ui-input"
          rows={3}
          defaultValue={allergyNotes ?? ""}
          placeholder="Лидокаин, fragrance sensitivity, latex..."
        />
      </div>

      <div>
        <label className="ui-label" htmlFor={`patient-contra-flags-${patientId}`}>
          Contraindication flags
        </label>
        <textarea
          id={`patient-contra-flags-${patientId}`}
          name="contraindicationFlags"
          className="ui-input"
          rows={3}
          defaultValue={contraindicationFlags ?? ""}
          placeholder="Isotretinoin, active flare, pregnancy caution..."
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
