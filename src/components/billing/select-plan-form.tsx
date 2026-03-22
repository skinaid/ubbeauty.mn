"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { selectPlanAction, type SelectPlanState } from "@/modules/subscriptions/actions";

type SelectPlanFormProps = {
  organizationId: string;
  planCode: string;
  isCurrentPlan: boolean;
  isSelectable: boolean;
};

const initialState: SelectPlanState = {};

export function SelectPlanForm({ organizationId, planCode, isCurrentPlan, isSelectable }: SelectPlanFormProps) {
  const [state, formAction, pending] = useActionState(selectPlanAction, initialState);

  return (
    <form action={formAction} className="ui-form-block">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="planCode" value={planCode} />
      <Button
        type="submit"
        variant="primary"
        className="ui-button--full"
        disabled={pending || isCurrentPlan || !isSelectable}
      >
        {isCurrentPlan ? "Current plan" : !isSelectable ? "Unavailable until billing" : pending ? "Saving..." : "Select plan"}
      </Button>
      {state.error ? (
        <p className="ui-inline-feedback ui-inline-feedback--error" style={{ margin: 0 }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
