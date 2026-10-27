"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Calculator, Check, ChevronDown, ChevronUp, Eye, FileCheck2, MapPinned, Pencil, X } from "lucide-react";
import { updateLeadInline } from "@/app/actions/leads";
import { LeadDeleteButton } from "@/components/lead-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type InlineLead = {
  id: string; updatedAt: string; assignedToName: string | null; itineraryId?: string | null; invoiceId?: string | null; estimateId?: string | null; confirmationId?: string | null;
  leadId: string; dateReceived: string; leadSource: string; channel: string; campaign: string; customerName: string; country: string; phone: string; whatsapp: string; preferredContact: string; email: string; travelDate: string; numberOfPax: string; adults: string; children: string; destination: string; duration: string; travelType: string; hotel: string; category: string; meal: string; preference: string; specialRequest: string; budgetUsd: string; leadStatus: string; dateConfirmation: string; leadQuality: string; assignedToId: string; lastContact: string; nextFollowUp: string; quotationNo: string; quotationValueUsd: string; followUpStatus: string; bookingStatus: string; bookingValueUsd: string; paymentStatus: string; lostReason: string; remarks: string;
};

type Option = { id: string; name: string };
type Field = { key: keyof InlineLead; label: string; type?: string; list?: string; required?: boolean; multiline?: boolean };
type State = { ok?: boolean; error?: string } | undefined;

const fields: Field[] = [
  { key: "leadId", label: "Lead ID", required: true }, { key: "dateReceived", label: "Date Received", type: "date", required: true }, { key: "leadSource", label: "Lead Source", list: "inline-lead-sources" }, { key: "channel", label: "Channel", list: "inline-channels" }, { key: "campaign", label: "Campaign" }, { key: "customerName", label: "Customer Name", required: true }, { key: "country", label: "Country", list: "inline-countries" }, { key: "phone", label: "Phone", type: "tel" }, { key: "whatsapp", label: "WhatsApp", type: "tel" }, { key: "preferredContact", label: "Preferred Contact", list: "inline-preferred-contacts" }, { key: "email", label: "Email", type: "email" }, { key: "travelDate", label: "Travel Date", type: "date" },
  { key: "numberOfPax", label: "No. of Pax", type: "number" }, { key: "adults", label: "Adults", type: "number" }, { key: "children", label: "Children", type: "number" }, { key: "destination", label: "Destination" }, { key: "duration", label: "Duration" }, { key: "travelType", label: "Travel Type", list: "inline-travel-types" }, { key: "hotel", label: "Hotel" }, { key: "category", label: "Hotel Category", list: "inline-hotel-categories" }, { key: "meal", label: "Meal Preference", list: "inline-meal-preferences" }, { key: "preference", label: "Preference", multiline: true }, { key: "specialRequest", label: "Special Request", multiline: true }, { key: "budgetUsd", label: "Budget (USD)", type: "number" }, { key: "leadStatus", label: "Lead Status", list: "inline-lead-statuses" }, { key: "dateConfirmation", label: "Date Confirmation", type: "date" }, { key: "leadQuality", label: "Lead Quality", list: "inline-lead-qualities" }, { key: "assignedToId", label: "Assigned To" }, { key: "lastContact", label: "Last Contact", type: "date" }, { key: "nextFollowUp", label: "Next Follow-up", type: "date" }, { key: "quotationNo", label: "Quotation No." }, { key: "quotationValueUsd", label: "Quotation Value (USD)", type: "number" }, { key: "followUpStatus", label: "Follow-up Status", list: "inline-follow-up-statuses" }, { key: "bookingStatus", label: "Booking Status", list: "inline-booking-statuses" }, { key: "bookingValueUsd", label: "Booking Value (USD)", type: "number" }, { key: "paymentStatus", label: "Payment Status", list: "inline-payment-statuses" }, { key: "lostReason", label: "Lost Reason", list: "inline-lost-reasons" }, { key: "remarks", label: "Remarks", multiline: true },
];

// Columns rendered as colored badges (instead of plain text) when not editing — keep in sync with the Tag colors used on the compact table.
const BADGE_FIELDS = new Set<keyof InlineLead>(["leadStatus", "leadQuality"]);
const TAG_PALETTE = [
  { badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { badge: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  { badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  { badge: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" },
  { badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  { badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
];
function tagStyle(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}
function Tag({ label }: { label: string }) {
  const { badge, dot } = tagStyle(label);
  return <Badge variant="outline" className={`gap-1.5 whitespace-nowrap font-normal ${badge}`}><span className={`size-1.5 rounded-full ${dot}`} />{label}</Badge>;
}

const inputClass = "h-8 min-w-36 rounded-md border border-input bg-white px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";
const shown = (value: string) => value || "—";
const headCellClass = "sticky top-0 z-20 w-48 max-w-48 border-b bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)] whitespace-nowrap";

function EditableRow({ lead, users, canDelete, canUpdate, canItinerary, writableKeys, visibleFields, editing, onEdit, onCancel, onSaved, zebra }: { lead: InlineLead; users: Option[]; canDelete: boolean; canUpdate: boolean; canItinerary: boolean; writableKeys: Set<string>; visibleFields: Field[]; editing: boolean; onEdit: () => void; onCancel: () => void; onSaved: () => void; zebra: string }) {
  const action = updateLeadInline.bind(null, lead.id, lead.updatedAt);
  const [state, formAction, pending] = useActionState<State, FormData>(action, undefined);
  const [actionsOpen, setActionsOpen] = useState(false);
  const formId = `lead-inline-${lead.id}`;
  useEffect(() => { if (state?.ok && editing) onSaved(); }, [state?.ok, editing, onSaved]);

  return <TableRow className={`group ${zebra} hover:bg-sky-50/60`}>
    <TableCell className={`sticky left-0 z-10 w-56 max-w-56 ${zebra} pl-4 align-top group-hover:bg-sky-50/60`}>
      {editing ? <div className="min-w-52 space-y-2"><form id={formId} action={formAction} /><div className="flex gap-1"><Button form={formId} type="submit" size="sm" disabled={pending}><Check />{pending ? "Đang lưu" : "Lưu"}</Button><Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}><X />Hủy</Button></div>{state?.error && <p role="alert" className="max-w-64 text-xs text-destructive">{state.error}</p>}</div> : <div className="space-y-1"><Button type="button" variant="outline" size="sm" onClick={() => setActionsOpen((open) => !open)} aria-expanded={actionsOpen}>Thao tác{actionsOpen ? <ChevronUp /> : <ChevronDown />}</Button>{actionsOpen && <div className="flex flex-col items-start gap-1">{canItinerary && <Button nativeButton={false} render={<Link href={lead.itineraryId ? `/quick/${lead.itineraryId}?edit=1` : `/leads/${lead.id}/itinerary`} />} variant="ghost" size="sm"><MapPinned />{lead.itineraryId ? "Sửa lịch trình" : "Tạo lịch trình"}</Button>}{(lead.confirmationId || canUpdate) && canItinerary && <Button nativeButton={false} render={<Link href={`/leads/${lead.id}/confirmation`} />} variant="ghost" size="sm"><FileCheck2 />{lead.confirmationId ? "Xem Confirmation" : "Tạo Confirmation"}</Button>}{canUpdate && <Button nativeButton={false} render={<Link href={`/leads/${lead.id}/invoice`} />} variant="ghost" size="sm">{lead.invoiceId ? "Xem Invoice" : "Tạo Invoice"}</Button>}{(lead.estimateId || canUpdate) && <Button nativeButton={false} render={<Link href={`/leads/${lead.id}/invoice/estimate`} />} variant="ghost" size="sm"><Calculator />{lead.estimateId ? (canUpdate ? "Sửa dự toán" : "Xem dự toán") : "Tạo dự toán"}</Button>}{canUpdate && <Button type="button" variant="ghost" size="sm" onClick={onEdit}><Pencil />Sửa dòng</Button>}<Button nativeButton={false} render={<Link href={`/leads/${lead.id}`} />} variant="ghost" size="sm"><Eye />Xem</Button>{canDelete && <LeadDeleteButton id={lead.id} />}</div>}</div>}
    </TableCell>
    {visibleFields.map((field) => { const fieldValue = lead[field.key] ?? ""; const writable = writableKeys.has(field.key); const displayValue = field.key === "assignedToId" ? shown(lead.assignedToName ?? "") : shown(fieldValue); return <TableCell key={field.key} className="w-48 max-w-48 align-top">{editing && writable ? field.key === "assignedToId" ? <select form={formId} name="assignedToId" defaultValue={lead.assignedToId} className={inputClass}><option value="">Chưa phân công</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select> : field.multiline ? <textarea form={formId} name={field.key} defaultValue={fieldValue} className={`${inputClass} h-20 min-w-64 py-1`} /> : <input form={formId} name={field.key} type={field.type ?? "text"} list={field.list} required={field.required} defaultValue={fieldValue} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? (field.key.toLowerCase().includes("value") || field.key === "budgetUsd" ? "0.01" : "1") : undefined} className={inputClass} /> : <>{editing && <input form={formId} type="hidden" name={field.key} value={fieldValue} />}<div className="max-w-48 truncate" title={displayValue}>{field.key === "leadId" ? <Link href={`/leads/${lead.id}`} className="font-medium text-sky-700 hover:underline">{displayValue}</Link> : BADGE_FIELDS.has(field.key) && fieldValue ? <Tag label={fieldValue} /> : displayValue}</div></>}</TableCell>; })}
  </TableRow>;
}

export function LeadAllColumnsTable({ leads, users, canDelete, canUpdate, fieldConfigs, readableKeys, writableKeys, options }: { leads: InlineLead[]; users: Option[]; canDelete: boolean; canUpdate: boolean; fieldConfigs: { fieldKey: string; label: string }[]; readableKeys: string[]; writableKeys: string[]; options: Record<string, Option[]> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const definitions = new Map(fields.map((field) => [field.key, field])); const visibleFields = fieldConfigs.map((config) => { const field = definitions.get(config.fieldKey as keyof InlineLead); return field ? { ...field, label: config.label } : null; }).filter((field): field is Field => field !== null && readableKeys.includes(field.key)); const writable = new Set(writableKeys);
  return <><Card className="gap-0 p-0">
      <div className="max-h-[75vh] overflow-auto">
        <Table className="min-w-[5600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 top-0 z-30 w-56 max-w-56 bg-slate-50 pl-4 shadow-[0_1px_0_0_theme(colors.slate.200)]">Thao tác</TableHead>
              {visibleFields.map((field) => <TableHead key={field.key} className={headCellClass}>{field.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead, i) => <EditableRow key={`${lead.id}-${editingId === lead.id}`} lead={lead} users={users} canDelete={canDelete} canUpdate={canUpdate} canItinerary={canUpdate && ["duration", "travelDate", "destination"].every((key) => readableKeys.includes(key))} writableKeys={writable} visibleFields={visibleFields} editing={editingId === lead.id} onEdit={() => setEditingId(lead.id)} onCancel={() => setEditingId(null)} onSaved={() => setEditingId(null)} zebra={i % 2 === 1 ? "bg-slate-50/70" : "bg-white"} />)}
            {!leads.length && <TableRow><TableCell colSpan={39} className="py-12 text-center text-muted-foreground">Không có Lead phù hợp.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>
    {Object.entries(options).map(([id, items]) => <datalist id={id} key={id}>{items.map((item) => <option key={item.id} value={item.name} />)}</datalist>)}
  </>;
}
