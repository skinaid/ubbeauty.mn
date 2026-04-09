"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  saveClinicReportPresetAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";
import type { ReportRangePreset } from "@/modules/clinic/reporting";

const initialState: ClinicSetupActionState = {};

export function SaveReportPresetForm({
  rangePreset,
  startDate,
  endDate,
  provider,
  location
}: {
  rangePreset: ReportRangePreset;
  startDate: string;
  endDate: string;
  provider: string;
  location: string;
}) {
  const [state, formAction, pending] = useActionState(saveClinicReportPresetAction, initialState);

  return (
    <form
      action={formAction}
      className="ui-form-stack"
      style={{ gap: "0.65rem" }}
      data-smoke-form="report-preset"
    >
      <input type="hidden" name="rangePreset" value={rangePreset} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="location" value={location} />

      <div>
        <label className="ui-label" htmlFor="report-preset-name">
          Preset name
        </label>
        <input
          id="report-preset-name"
          name="name"
          className="ui-input"
          placeholder="Жишээ нь: 7 хоногийн Central report"
          data-smoke-field="preset-name"
        />
      </div>

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {pending ? "Хадгалж байна..." : "Preset хадгалах"}
      </Button>

      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
