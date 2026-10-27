"use client";

import { startTransition, useActionState } from "react";
import type { TourOperationOrderState } from "@/app/actions/tour-operation-orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type TourOperationOrderFormValue = { companyName: string; companyAddress: string; companyPhone: string; companyTaxCode: string; tourCode: string; guestCount: string; startDate: string; endDate: string; tourName: string; tourGuideNames: string; operatorName: string; operatorTitle: string; decisionText: string };

export function TourOperationOrderForm({ action, initial }: { action: (state: TourOperationOrderState, formData: FormData) => Promise<TourOperationOrderState>; initial: TourOperationOrderFormValue }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => formAction(data)); }} className="space-y-5">
    {state?.error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
    <fieldset disabled={pending} className="contents">
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium md:col-span-2">Tên công ty<Input name="companyName" defaultValue={initial.companyName} maxLength={200} required /></label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Địa chỉ<Textarea name="companyAddress" defaultValue={initial.companyAddress} maxLength={1000} required /></label>
        <label className="space-y-1 text-sm font-medium">Điện thoại<Input name="companyPhone" type="tel" defaultValue={initial.companyPhone} maxLength={50} /></label>
        <label className="space-y-1 text-sm font-medium">Mã số thuế<Input name="companyTaxCode" defaultValue={initial.companyTaxCode} maxLength={50} required /></label>
        <label className="space-y-1 text-sm font-medium">Mã code<Input name="tourCode" defaultValue={initial.tourCode} maxLength={100} required /></label>
        <label className="space-y-1 text-sm font-medium">Số khách<Input name="guestCount" defaultValue={initial.guestCount} maxLength={100} required /></label>
        <label className="space-y-1 text-sm font-medium">Ngày bắt đầu<Input name="startDate" type="date" defaultValue={initial.startDate} required /></label>
        <label className="space-y-1 text-sm font-medium">Ngày kết thúc<Input name="endDate" type="date" defaultValue={initial.endDate} required /></label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Tour tham quan<Textarea name="tourName" defaultValue={initial.tourName} rows={3} maxLength={1000} required /></label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Hướng dẫn viên<Textarea name="tourGuideNames" defaultValue={initial.tourGuideNames} rows={4} maxLength={2000} placeholder="Mỗi hướng dẫn viên một dòng" /></label>
        <label className="space-y-1 text-sm font-medium">Điều hành Tour<Input name="operatorName" defaultValue={initial.operatorName} maxLength={200} /></label>
        <label className="space-y-1 text-sm font-medium">Chức vụ<Input name="operatorTitle" defaultValue={initial.operatorTitle} maxLength={150} /></label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Nội dung quyết định<Textarea name="decisionText" defaultValue={initial.decisionText} rows={3} maxLength={2000} required /></label>
      </Card>
      <div className="flex justify-end"><Button type="submit">{pending ? "Đang lưu..." : "Lưu và xem lệnh điều Tour"}</Button></div>
    </fieldset>
  </form>;
}
