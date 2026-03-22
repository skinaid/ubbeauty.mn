"use client";

import { useActionState } from "react";
import { loginWithOtpAction, type AuthActionState } from "@/modules/auth/actions";
import { Alert, Button, Input } from "@/components/ui";

const initialState: AuthActionState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginWithOtpAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <label className="ui-label" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Sending..." : "Send login link"}
      </Button>
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      {state.message ? <Alert variant="success">{state.message}</Alert> : null}
    </form>
  );
}
