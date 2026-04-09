"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  updateOrganizationAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function EditOrganizationForm({
  organization
}: {
  organization: { name: string; slug: string };
}) {
  const [state, formAction, pending] = useActionState(updateOrganizationAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <div>
        <label className="ui-label" htmlFor="org-name">
          Эмнэлгийн нэр
        </label>
        <Input id="org-name" name="name" defaultValue={organization.name} required maxLength={140} />
      </div>
      <div>
        <label className="ui-label" htmlFor="org-slug">
          Clinic URL slug (public url)
        </label>
        <Input id="org-slug" name="slug" defaultValue={organization.slug} required />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Хадгалж байна..." : "Хадгалах"}
      </Button>
      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
