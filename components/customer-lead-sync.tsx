"use client";

import { useActionState, useState } from "react";
import { DatabaseZap } from "lucide-react";
import { syncCustomersFromLeads, type CustomerLeadSyncState } from "@/app/actions/customer-lead-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

export function CustomerLeadSync() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CustomerLeadSyncState, FormData>(syncCustomersFromLeads, undefined);
  const pairs = state?.updates?.map(({ customerId, leadId }) => ({ customerId, leadId })) ?? [];
  return <div className="space-y-4">
    <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}><DatabaseZap />Lấy dữ liệu từ Leads</Button>
    {open && <Card>
      <CardHeader><CardTitle>Đồng bộ Lead sang Customer</CardTitle><CardDescription>Lọc Lead có Created At hoặc Updated At trong khoảng ngày. Khách mới được tạo ngay; khách đã tồn tại chỉ cập nhật sau khi xác nhận.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="mode" value="preview" /><label className="space-y-1 text-sm font-medium">Từ ngày<Input name="from" type="date" defaultValue={monthStart()} required /></label><label className="space-y-1 text-sm font-medium">Đến ngày<Input name="to" type="date" defaultValue={today()} required /></label><Button type="submit" className="self-end" disabled={pending}>{pending ? "Đang lấy dữ liệu..." : "Kiểm tra và tạo khách mới"}</Button></form>
        {state?.error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
        {state?.message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>}
        {state?.updates && <div className="space-y-3"><div><h3 className="font-semibold">Customer cần xác nhận cập nhật ({state.updates.length})</h3><p className="text-sm text-muted-foreground">Nhận diện theo thứ tự Phone → WhatsApp → Email.</p></div>{state.updates.map((item) => <div key={item.customerId} className="rounded-md border p-3 text-sm"><p className="font-medium">{item.customerCode} · {item.customerName} ← Lead {item.leadCode}</p><div className="mt-2 grid gap-1">{item.changes.map((change) => <p key={change.label}><span className="font-medium">{change.label}:</span> <span className="text-muted-foreground line-through">{change.before}</span> → {change.after}</p>)}</div></div>)}{state.updates.length > 0 && <form action={action}><input type="hidden" name="mode" value="confirm" /><input type="hidden" name="pairs" value={JSON.stringify(pairs)} /><Button type="submit" disabled={pending}>{pending ? "Đang cập nhật..." : `Xác nhận cập nhật ${state.updates.length} khách hàng`}</Button></form>}{state.updates.length === 0 && <p className="text-sm text-muted-foreground">Không có Customer nào cần cập nhật.</p>}</div>}
      </CardContent>
    </Card>}
  </div>;
}
