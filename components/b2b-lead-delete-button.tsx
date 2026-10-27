"use client";

import { Trash2 } from "lucide-react";
import { deleteB2BLead } from "@/app/actions/b2b-leads";
import { Button } from "@/components/ui/button";

export function B2BLeadDeleteButton({ id }: { id: string }) {
  return <form action={deleteB2BLead.bind(null, id)} onSubmit={(event) => { if (!window.confirm("Xóa Lead B2B này?")) event.preventDefault(); }}><Button type="submit" variant="destructive" size="sm"><Trash2 />Xóa</Button></form>;
}
