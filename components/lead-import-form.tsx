"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { importLeads } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = { error?: string; imported?: number; skipped?: number; errors?: string[] } | undefined;

export function LeadImportForm() {
  const [state, action, pending] = useActionState(async (_: State, formData: FormData): Promise<State> => {
    try { return await importLeads(formData); } catch (error) { return { error: error instanceof Error ? error.message : "Không thể import file." }; }
  }, undefined);
  return <form action={action} className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="max-w-md" required /><Button type="submit" disabled={pending}><Upload />{pending ? "Đang import..." : "Import Excel"}</Button></div>{state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}{state?.imported !== undefined && <div className="rounded-md border bg-slate-50 p-3 text-sm"><p className="font-medium">Đã import {state.imported} dòng; bỏ qua {state.skipped ?? 0} dòng.</p>{state.errors?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">{state.errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}</div>}</form>;
}
