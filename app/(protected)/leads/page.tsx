import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  CalendarDays,
  Calculator,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  Rows3,
  Search,
  Table2,
  UserRound,
  X,
} from "lucide-react";
import { LeadAllColumnsTable, type InlineLead } from "@/components/lead-all-columns-table";
import { LeadImportPanel } from "@/components/lead-import-panel";
import { LeadDeleteButton } from "@/components/lead-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const date = (v: Date | null) => v?.toLocaleDateString("vi-VN") ?? "—";
const text = (v: unknown) => v === null || v === undefined ? "" : String(v);
const inputDate = (v: Date | null) => v?.toISOString().slice(0, 10) ?? "";
type Params = { view?: string; q?: string; status?: string; quality?: string; assigned?: string; leadSource?: string; channel?: string; travelType?: string; receivedFrom?: string; receivedTo?: string; travelFrom?: string; travelTo?: string; sortBy?: string; sortDir?: string; page?: string };
type Named = { id: string; name: string };
const unique = (...groups: { name: string | null }[][]) => [...new Set(groups.flat().map((v) => v.name?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "vi"));
const validDate = (value: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : "";
const dateStart = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dateEnd = (value: string) => new Date(`${value}T23:59:59.999Z`);
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
function quickDateRanges() {
  const now = new Date(); const year = now.getUTCFullYear(); const month = now.getUTCMonth(); const quarterMonth = Math.floor(month / 3) * 3;
  const range = (start: Date, end: Date) => ({ from: isoDate(start), to: isoDate(end) });
  return [
    { label: "Tháng này", ...range(new Date(Date.UTC(year, month, 1)), new Date(Date.UTC(year, month + 1, 0))) },
    { label: "Tháng trước", ...range(new Date(Date.UTC(year, month - 1, 1)), new Date(Date.UTC(year, month, 0))) },
    { label: "Quý này", ...range(new Date(Date.UTC(year, quarterMonth, 1)), new Date(Date.UTC(year, quarterMonth + 3, 0))) },
    { label: "Quý trước", ...range(new Date(Date.UTC(year, quarterMonth - 3, 1)), new Date(Date.UTC(year, quarterMonth, 0))) },
  ];
}

// Deterministic color per status/quality label so the same word always reads the same way.
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
  if (!label) return { badge: "bg-slate-50 text-muted-foreground border-slate-200", dot: "bg-slate-300" };
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}
function Tag({ label }: { label: string }) {
  const { badge, dot } = tagStyle(label);
  return <Badge variant="outline" className={`gap-1.5 font-normal ${badge}`}><span className={`size-1.5 rounded-full ${dot}`} />{label}</Badge>;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const [canRead, canCreate, canUpdate, canDelete, canImport, canExport, fieldAccess] = await Promise.all([hasResourceAction(user, "LEADS", "READ"), hasResourceAction(user, "LEADS", "CREATE"), hasResourceAction(user, "LEADS", "UPDATE"), hasResourceAction(user, "LEADS", "DELETE"), hasResourceAction(user, "LEADS", "IMPORT"), hasResourceAction(user, "LEADS", "EXPORT"), getLeadFieldAccess(user)]);
  if (!canRead) redirect("/");
  const params = await searchParams;
  const { view = "compact", q = "", status = "", quality = "", assigned = "", leadSource = "", channel = "", travelType = "" } = params;
  const receivedFrom = fieldAccess.readable.has("dateReceived") ? validDate(params.receivedFrom) : ""; const receivedTo = fieldAccess.readable.has("dateReceived") ? validDate(params.receivedTo) : "";
  const travelFrom = fieldAccess.readable.has("travelDate") ? validDate(params.travelFrom) : ""; const travelTo = fieldAccess.readable.has("travelDate") ? validDate(params.travelTo) : "";
  const sortBy = params.sortBy === "travelDate" ? "travelDate" : "dateReceived";
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";
  const showAll = view === "all"; const pageSize = 25;
  const where: Prisma.LeadWhereInput = { ...(q.trim() ? { customerName: { contains: q.trim(), mode: "insensitive" } } : {}), ...(status ? { leadStatus: status } : {}), ...(quality ? { leadQuality: quality } : {}), ...(assigned ? { assignedToId: assigned } : {}), ...(leadSource ? { leadSource } : {}), ...(channel ? { channel } : {}), ...(travelType ? { travelType } : {}), ...(receivedFrom || receivedTo ? { dateReceived: { ...(receivedFrom ? { gte: dateStart(receivedFrom) } : {}), ...(receivedTo ? { lte: dateEnd(receivedTo) } : {}) } } : {}), ...(travelFrom || travelTo ? { travelDate: { ...(travelFrom ? { gte: dateStart(travelFrom) } : {}), ...(travelTo ? { lte: dateEnd(travelTo) } : {}) } } : {}) };
  const [total, sm, su, qm, qu, lm, lu, cm, cu, tm, tu, users] = await Promise.all([
    prisma.lead.count({ where }), prisma.leadStatus.findMany({ where: { active: true }, select: { name: true } }), prisma.lead.findMany({ distinct: ["leadStatus"], where: { leadStatus: { not: null } }, select: { leadStatus: true } }).then((a) => a.map((v) => ({ name: v.leadStatus }))), prisma.leadQuality.findMany({ where: { active: true }, select: { name: true } }), prisma.lead.findMany({ distinct: ["leadQuality"], where: { leadQuality: { not: null } }, select: { leadQuality: true } }).then((a) => a.map((v) => ({ name: v.leadQuality }))), prisma.leadSource.findMany({ where: { active: true }, select: { name: true } }), prisma.lead.findMany({ distinct: ["leadSource"], where: { leadSource: { not: null } }, select: { leadSource: true } }).then((a) => a.map((v) => ({ name: v.leadSource }))), prisma.channel.findMany({ where: { active: true }, select: { name: true } }), prisma.lead.findMany({ distinct: ["channel"], where: { channel: { not: null } }, select: { channel: true } }).then((a) => a.map((v) => ({ name: v.channel }))), prisma.travelType.findMany({ where: { active: true }, select: { name: true } }), prisma.lead.findMany({ distinct: ["travelType"], where: { travelType: { not: null } }, select: { travelType: true } }).then((a) => a.map((v) => ({ name: v.travelType }))), prisma.user.findMany({ where: { OR: [{ active: true }, { assignedLeads: { some: {} } }] }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize)); const requested = Number.parseInt(params.page ?? "1", 10); const currentPage = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
  const leads = await prisma.lead.findMany({ where, include: { assignedTo: { select: { fullName: true } }, quickItinerary: { select: { id: true, documentEnabled: true } }, invoice: { select: { id: true } }, estimate: { select: { id: true } }, confirmation: { select: { id: true } } }, orderBy: [{ [sortBy]: sortDir }, { createdAt: "desc" }], skip: (currentPage - 1) * pageSize, take: pageSize });
  const statuses = unique(sm, su); const qualities = unique(qm, qu); const leadSources = unique(lm, lu); const channels = unique(cm, cu); const travelTypes = unique(tm, tu);
  const masterQuery = { where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" as const } };
  const masters = showAll ? await Promise.all([prisma.leadSource.findMany(masterQuery), prisma.country.findMany(masterQuery), prisma.preferredContact.findMany(masterQuery), prisma.hotelCategory.findMany(masterQuery), prisma.mealPreference.findMany(masterQuery), prisma.followUpStatus.findMany(masterQuery), prisma.leadBookingStatus.findMany(masterQuery), prisma.paymentStatus.findMany(masterQuery), prisma.lostReason.findMany(masterQuery)]) : null;
  const named = (items: string[], prefix: string): Named[] => items.map((name) => ({ id: `${prefix}-${name}`, name }));
  const options: Record<string, Named[]> = masters ? { "inline-lead-sources": masters[0], "inline-channels": named(channels, "channel"), "inline-countries": masters[1], "inline-preferred-contacts": masters[2], "inline-travel-types": named(travelTypes, "travel"), "inline-hotel-categories": masters[3], "inline-meal-preferences": masters[4], "inline-lead-statuses": named(statuses, "status"), "inline-lead-qualities": named(qualities, "quality"), "inline-follow-up-statuses": masters[5], "inline-booking-statuses": masters[6], "inline-payment-statuses": masters[7], "inline-lost-reasons": masters[8] } : {};
  const inlineLeads: InlineLead[] = leads.map((l) => ({ id: l.id, updatedAt: l.updatedAt.toISOString(), assignedToName: l.assignedTo?.fullName ?? null, leadId: l.leadId, dateReceived: inputDate(l.dateReceived), leadSource: text(l.leadSource), channel: text(l.channel), campaign: text(l.campaign), customerName: l.customerName, country: text(l.country), phone: text(l.phone), whatsapp: text(l.whatsapp), preferredContact: text(l.preferredContact), email: text(l.email), travelDate: inputDate(l.travelDate), numberOfPax: text(l.numberOfPax), adults: text(l.adults), children: text(l.children), destination: text(l.destination), duration: text(l.duration), travelType: text(l.travelType), hotel: text(l.hotel), category: text(l.category), meal: text(l.meal), preference: text(l.preference), specialRequest: text(l.specialRequest), budgetUsd: text(l.budgetUsd), leadStatus: text(l.leadStatus), dateConfirmation: inputDate(l.dateConfirmation), leadQuality: text(l.leadQuality), assignedToId: text(l.assignedToId), lastContact: inputDate(l.lastContact), nextFollowUp: inputDate(l.nextFollowUp), quotationNo: text(l.quotationNo), quotationValueUsd: text(l.quotationValueUsd), followUpStatus: text(l.followUpStatus), bookingStatus: text(l.bookingStatus), bookingValueUsd: text(l.bookingValueUsd), paymentStatus: text(l.paymentStatus), lostReason: text(l.lostReason), remarks: text(l.remarks) }));
  inlineLeads.forEach((lead, index) => { lead.itineraryId = leads[index].quickItinerary?.documentEnabled ? leads[index].quickItinerary.id : null; lead.invoiceId = leads[index].invoice?.id ?? null; lead.estimateId = leads[index].estimate?.id ?? null; lead.confirmationId = leads[index].confirmation?.id ?? null; });
  const canField = (key: string) => fieldAccess.readable.has(key);
  for (const lead of inlineLeads) { for (const key of fieldAccess.fields.map((field) => field.fieldKey)) if (!fieldAccess.readable.has(key)) lead[key as keyof InlineLead] = "" as never; if (!fieldAccess.readable.has("assignedToId")) lead.assignedToName = null; }
  const href = (changes: Partial<Params>) => { const query = new URLSearchParams(); Object.entries({ ...params, ...changes }).forEach(([key, v]) => { if (v) query.set(key, v); }); return query.size ? `/leads?${query}` : "/leads"; };
  const quickRanges = quickDateRanges();
  const Actions = ({ id, itineraryId, invoiceId, estimateId, confirmationId }: { id: string; itineraryId?: string | null; invoiceId?: string | null; estimateId?: string | null; confirmationId?: string | null }) => <div className="flex items-center gap-1"><Button nativeButton={false} render={<Link href={`/leads/${id}`} />} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><Eye />Xem</Button>{canUpdate && ["duration", "travelDate", "destination"].every((field) => fieldAccess.readable.has(field)) && <Button nativeButton={false} render={<Link href={itineraryId ? `/quick/${itineraryId}?edit=1` : `/leads/${id}/itinerary`} />} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><MapPinned />{itineraryId ? "Sửa lịch trình" : "Tạo lịch trình"}</Button>}{(confirmationId || canUpdate) && ["leadId", "duration", "travelDate", "destination"].every((field) => fieldAccess.readable.has(field)) && <Button nativeButton={false} render={<Link href={`/leads/${id}/confirmation`} />} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><FileCheck2 />{confirmationId ? "Xem Confirmation" : "Tạo Confirmation"}</Button>}{canUpdate && <Button nativeButton={false} render={<Link href={`/leads/${id}/invoice`} />} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">{invoiceId ? "Xem Invoice" : "Tạo Invoice"}</Button>}{(estimateId || canUpdate) && <Button nativeButton={false} render={<Link href={`/leads/${id}/invoice/estimate`} />} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><Calculator />{estimateId ? (canUpdate ? "Sửa dự toán" : "Xem dự toán") : "Tạo dự toán"}</Button>}{canUpdate && <Button nativeButton={false} render={<Link href={`/leads/${id}?edit=1`} />} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><Pencil />Sửa</Button>}{canDelete && <LeadDeleteButton id={id} />}</div>;

  const activeFilters: { key: keyof Params; label: string }[] = [
    ...(q.trim() ? [{ key: "q" as const, label: `Tên: "${q.trim()}"` }] : []),
    ...(status ? [{ key: "status" as const, label: `Trạng thái: ${status}` }] : []),
    ...(quality ? [{ key: "quality" as const, label: `Chất lượng: ${quality}` }] : []),
    ...(assigned ? [{ key: "assigned" as const, label: `Phụ trách: ${users.find((u) => u.id === assigned)?.fullName ?? assigned}` }] : []),
    ...(leadSource ? [{ key: "leadSource" as const, label: `Lead Source: ${leadSource}` }] : []),
    ...(channel ? [{ key: "channel" as const, label: `Channel: ${channel}` }] : []),
    ...(travelType ? [{ key: "travelType" as const, label: `Travel Type: ${travelType}` }] : []),
    ...(receivedFrom ? [{ key: "receivedFrom" as const, label: `Date Received từ: ${receivedFrom}` }] : []),
    ...(receivedTo ? [{ key: "receivedTo" as const, label: `Date Received đến: ${receivedTo}` }] : []),
    ...(travelFrom ? [{ key: "travelFrom" as const, label: `Travel Date từ: ${travelFrom}` }] : []),
    ...(travelTo ? [{ key: "travelTo" as const, label: `Travel Date đến: ${travelTo}` }] : []),
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">Lead</h1>
          <Badge variant="secondary" className="rounded-full font-normal text-muted-foreground">{total} lead</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Theo dõi yêu cầu khách hàng và tiến trình tư vấn.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
          <Button nativeButton={false} render={<Link href="/leads/dashboard" />} variant="ghost" size="sm" className="text-muted-foreground"><ChartNoAxesCombined />Dashboard</Button>
          <Button nativeButton={false} render={<Link href="/admin/channels" />} variant="ghost" size="sm" className="text-muted-foreground"><Database />Master Data</Button>
          {canExport && <Button nativeButton={false} render={<a href="/api/leads/export" />} variant="ghost" size="sm" className="text-muted-foreground"><Download />Xuất Excel</Button>}
          {canImport && <Button nativeButton={false} render={<a href="/api/leads/template" />} variant="ghost" size="sm" className="text-muted-foreground"><FileSpreadsheet />Mẫu import</Button>}
          <Button nativeButton={false} render={<Link href={href({ view: showAll ? undefined : "all", page: undefined })} />} variant="ghost" size="sm" className="text-muted-foreground">{showAll ? <Rows3 /> : <Table2 />}{showAll ? "Danh sách gọn" : "Tất cả cột"}</Button>
        </div>
        {canCreate && <Button nativeButton={false} render={<Link href="/leads/new" />}><Plus />Tạo Lead</Button>}
      </div>
    </div>

    {canImport && <LeadImportPanel />}

    <Card className="gap-0 border bg-white p-4">
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <Field label="Khách hàng" className="xl:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Tìm gần đúng Customer Name" className="pl-8" />
          </div>
        </Field>
        <Field label="Lead Status"><Filter name="status" value={status} label="Mọi trạng thái" options={statuses} /></Field>
        <Field label="Lead Quality"><Filter name="quality" value={quality} label="Mọi chất lượng" options={qualities} /></Field>
        <Field label="Assigned To">
          <select name="assigned" defaultValue={assigned} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"><option value="">Mọi người phụ trách</option>{users.map((v) => <option key={v.id} value={v.id}>{v.fullName}</option>)}</select>
        </Field>
        <Field label="Lead Source"><Filter name="leadSource" value={leadSource} label="Mọi nguồn Lead" options={leadSources} /></Field>
        <Field label="Channel"><Filter name="channel" value={channel} label="Mọi channel" options={channels} /></Field>
        <Field label="Travel Type"><Filter name="travelType" value={travelType} label="Mọi loại hình" options={travelTypes} /></Field>
        {fieldAccess.readable.has("dateReceived") && <DateRangeFields label="Khoảng Date Received" fromName="receivedFrom" toName="receivedTo" from={receivedFrom} to={receivedTo} ranges={quickRanges} href={(from, to) => href({ receivedFrom: from, receivedTo: to, page: undefined })} />}
        {fieldAccess.readable.has("travelDate") && <DateRangeFields label="Khoảng Travel Date" fromName="travelFrom" toName="travelTo" from={travelFrom} to={travelTo} ranges={quickRanges} href={(from, to) => href({ travelFrom: from, travelTo: to, page: undefined })} />}
        <Field label="Sắp xếp theo">
          <select name="sortBy" defaultValue={sortBy} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"><option value="dateReceived">Date Received</option><option value="travelDate">Travel Date</option></select>
        </Field>
        <Field label="Chiều sắp xếp">
          <select name="sortDir" defaultValue={sortDir} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select>
        </Field>
        <div className="flex items-end gap-2">
          <input type="hidden" name="view" value={showAll ? "all" : "compact"} />
          <Button type="submit" className="flex-1">Lọc</Button>
          <Button nativeButton={false} render={<Link href={showAll ? "/leads?view=all" : "/leads"} />} variant="outline">Xóa lọc</Button>
        </div>
      </form>
      {activeFilters.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
        {activeFilters.map((f) => <Link key={f.key} href={href({ [f.key]: undefined })} className="group inline-flex items-center gap-1 rounded-full border bg-slate-50 py-1 pl-2.5 pr-1.5 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-100">{f.label}<X className="size-3 text-slate-400 group-hover:text-slate-600" /></Link>)}
      </div>}
    </Card>

    {showAll ? <LeadAllColumnsTable leads={inlineLeads} users={users.map((v) => ({ id: v.id, name: v.fullName }))} canDelete={canDelete} canUpdate={canUpdate} fieldConfigs={fieldAccess.fields} readableKeys={[...fieldAccess.readable]} writableKeys={[...fieldAccess.writable]} options={options} /> : <Card className="gap-0 overflow-hidden p-0">
      <div className="max-h-[70vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 pl-4 shadow-[0_1px_0_0_theme(colors.slate.200)]">Lead</TableHead>
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)]">Khách hàng</TableHead>
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)]">Nguồn / Channel</TableHead>
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)]">Travel Date</TableHead>
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)]">Trạng thái</TableHead>
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)]">Date Confirmation</TableHead>
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)]">Assigned To</TableHead>
              <TableHead className="sticky top-0 z-10 border-b bg-slate-50 pr-4 text-right shadow-[0_1px_0_0_theme(colors.slate.200)]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => <TableRow key={l.id} className="odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/60">
              <TableCell className="pl-4"><p className="font-medium">{canField("leadId") ? <Link href={`/leads/${l.id}`} className="text-sky-700 hover:underline">{l.leadId}</Link> : "—"}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3" />{canField("dateReceived") ? date(l.dateReceived) : "—"}</p></TableCell>
              <TableCell><p className="font-medium text-foreground">{canField("customerName") ? l.customerName : "—"}</p><p className="flex items-center gap-1 text-xs text-muted-foreground">{(canField("country") && l.country || canField("destination") && l.destination) && <MapPin className="size-3" />}{(canField("country") && l.country) || (canField("destination") && l.destination) || "—"}</p></TableCell>
              <TableCell className="text-sm text-muted-foreground">{[canField("leadSource") ? l.leadSource : null, canField("channel") ? l.channel : null].filter(Boolean).join(" / ") || "—"}</TableCell>
              <TableCell className="text-sm">{canField("travelDate") ? date(l.travelDate) : "—"}</TableCell>
              <TableCell>{canField("leadStatus") && l.leadStatus ? <Tag label={l.leadStatus} /> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-sm">{canField("dateConfirmation") ? date(l.dateConfirmation) : "—"}</TableCell>
              <TableCell>{canField("assignedToId") && l.assignedTo?.fullName ? <span className="inline-flex items-center gap-1.5 text-sm"><UserRound className="size-3.5 text-muted-foreground" />{l.assignedTo.fullName}</span> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
              <TableCell className="pr-4"><div className="flex justify-end"><Actions id={l.id} itineraryId={l.quickItinerary?.documentEnabled ? l.quickItinerary.id : null} invoiceId={l.invoice?.id} estimateId={l.estimate?.id} confirmationId={l.confirmation?.id} /></div></TableCell>
            </TableRow>)}
            {!leads.length && <TableRow><TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">Không có Lead phù hợp với bộ lọc hiện tại.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>}

    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">Hiển thị {total ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, total)} trong {total} Lead</p>
      <div className="flex flex-wrap items-center gap-2">
        <PageLink href={href({ page: undefined })} disabled={currentPage <= 1}><ChevronsLeft /><span className="sr-only">Trang đầu</span></PageLink>
        <PageLink href={href({ page: String(Math.max(1, currentPage - 1)) })} disabled={currentPage <= 1}><ChevronLeft />Trước</PageLink>
        <form action="/leads" className="flex items-center gap-1.5 text-muted-foreground">
          {Object.entries(params).filter(([key, v]) => key !== "page" && v).map(([key, v]) => <input key={key} type="hidden" name={key} value={v} />)}
          <span>Trang</span>
          <Input key={currentPage} name="page" type="number" min={1} max={totalPages} defaultValue={currentPage} aria-label="Số trang" className="h-8 w-16 text-center" />
          <span>/ {totalPages}</span>
          <Button type="submit" variant="outline" size="sm">Đi</Button>
        </form>
        <PageLink href={href({ page: String(Math.min(totalPages, currentPage + 1)) })} disabled={currentPage >= totalPages}>Sau<ChevronRight /></PageLink>
        <PageLink href={href({ page: String(totalPages) })} disabled={currentPage >= totalPages}><ChevronsRight /><span className="sr-only">Trang cuối</span></PageLink>
      </div>
    </div>
  </div>;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`flex flex-col gap-1 text-xs font-medium text-muted-foreground ${className ?? ""}`}>{label}{children}</label>;
}
function Filter({ name, value, label, options }: { name: string; value: string; label: string; options: string[] }) { return <select name={name} defaultValue={value} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"><option value="">{label}</option>{options.map((v) => <option key={v} value={v}>{v}</option>)}</select>; }
function DateRangeFields({ label, fromName, toName, from, to, ranges, href }: { label: string; fromName: string; toName: string; from: string; to: string; ranges: { label: string; from: string; to: string }[]; href: (from: string, to: string) => string }) { return <div className="space-y-1 xl:col-span-2"><p className="text-xs font-medium text-muted-foreground">{label}</p><div className="grid grid-cols-2 gap-2"><Input type="date" name={fromName} defaultValue={from} aria-label={`${label} từ ngày`} /><Input type="date" name={toName} defaultValue={to} aria-label={`${label} đến ngày`} /></div><div className="flex flex-wrap gap-1">{ranges.map((range) => <Link key={range.label} href={href(range.from, range.to)} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-slate-50 hover:text-foreground">{range.label}</Link>)}</div></div>; }
function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) { return <Button nativeButton={false} render={<Link href={href} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} />} variant="outline" size="sm" className={disabled ? "pointer-events-none opacity-50" : undefined}>{children}</Button>; }
