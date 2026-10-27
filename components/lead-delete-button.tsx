"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteLead } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";

type State = { error?: string } | undefined;

export function LeadDeleteButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(async (): Promise<State> => {
    try { await deleteLead(id); return undefined; } catch (error) { return { error: error instanceof Error ? error.message : "Không thể xóa Lead." }; }
  }, undefined);
  return <form action={action} onSubmit={(event) => { if (!window.confirm("Xóa vĩnh viễn Lead này? Thao tác này không thể hoàn tác.")) event.preventDefault(); }} className="flex items-center gap-1"><Button type="submit" variant="destructive" size="sm" disabled={pending}><Trash2 />{pending ? "Đang xóa" : "Xóa"}</Button>{state?.error && <span role="alert" className="max-w-48 text-xs text-destructive">{state.error}</span>}</form>;
}
