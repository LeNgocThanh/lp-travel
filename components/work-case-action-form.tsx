"use client";

import { useActionState } from "react";

type Action = (formData: FormData) => unknown | Promise<unknown>;
type State = { error?: string } | undefined;

export function WorkCaseActionForm({ action, children, className }: { action: Action; children: React.ReactNode; className?: string }) {
  const [state, formAction, pending] = useActionState(async (_: State, formData: FormData): Promise<State> => {
    try {
      const result = await action(formData);
      if (result && typeof result === "object" && "error" in result && typeof result.error === "string") return { error: result.error };
      return undefined;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Không thể thực hiện thao tác. Vui lòng thử lại." };
    }
  }, undefined);

  return <form action={formAction} className={className}>
    {state?.error && <p role="alert" aria-live="polite" className="col-span-full rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
    <fieldset disabled={pending} className="contents">{children}</fieldset>
  </form>;
}
