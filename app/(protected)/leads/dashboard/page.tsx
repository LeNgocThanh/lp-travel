import Link from "next/link";
import { ArrowLeft, CalendarDays, ChartNoAxesCombined, CircleDollarSign, Target, TrendingUp, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type SearchParams = { type?: string; from?: string; to?: string; confirmationFrom?: string; confirmationTo?: string };
const stages = [
  { label: "New", aliases: ["new", "mới"] },
  { label: "Contacted", aliases: ["contacted", "đã liên hệ"] },
  { label: "Qualified", aliases: ["qualified", "đủ điều kiện"] },
  { label: "Quotation Sent", aliases: ["quotation sent", "đã gửi báo giá"] },
  { label: "Follow-up", aliases: ["follow-up", "follow up", "chăm sóc"] },
  { label: "Negotiation", aliases: ["negotiation", "đàm phán"] },
  { label: "Confirmed", aliases: ["confirmed", "xác nhận", "đã xác nhận"] },
  { label: "Lost", aliases: ["lost", "thất bại", "đã mất"] },
];

const normalize = (value: string | null) => value?.trim().toLocaleLowerCase("vi") ?? "";
const matches = (value: string | null, aliases: string[]) => aliases.includes(normalize(value));
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const rate = (numerator: number, denominator: number) => denominator ? `${(numerator / denominator * 100).toFixed(1)}%` : "0.0%";

export default async function LeadDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const [canRead, fieldAccess] = await Promise.all([hasResourceAction(user, "LEADS", "READ"), getLeadFieldAccess(user)]);
  if (!canRead) redirect("/");
  const params = await searchParams;
  const type = params.type === "b2b" ? "b2b" : "b2c";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : "";
  const canConfirmation = fieldAccess.readable.has("dateConfirmation");
  const confirmationFrom = canConfirmation && /^\d{4}-\d{2}-\d{2}$/.test(params.confirmationFrom ?? "") ? params.confirmationFrom! : "";
  const confirmationTo = canConfirmation && /^\d{4}-\d{2}-\d{2}$/.test(params.confirmationTo ?? "") ? params.confirmationTo! : "";
  const where = { ...(from || to ? { dateReceived: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}), ...(confirmationFrom || confirmationTo ? { dateConfirmation: { ...(confirmationFrom ? { gte: new Date(`${confirmationFrom}T00:00:00.000Z`) } : {}), ...(confirmationTo ? { lte: new Date(`${confirmationTo}T23:59:59.999Z`) } : {}) } } : {}) };
  const leads = type === "b2b" ? await prisma.b2BLead.findMany({ where, select: { leadStatus: true, leadQuality: true, quotationValueUsd: true, bookingValueUsd: true } }) : await prisma.lead.findMany({ where, select: { leadStatus: true, leadQuality: true, quotationValueUsd: true, bookingValueUsd: true } });
  const counts = stages.map((stage) => ({ ...stage, count: leads.filter((lead) => matches(lead.leadStatus, stage.aliases)).length }));
  const count = (label: string) => counts.find((stage) => stage.label === label)?.count ?? 0;
  const total = leads.length; const newLeads = count("New"); const quotationSent = count("Quotation Sent"); const confirmed = count("Confirmed"); const lost = count("Lost");
  const hot = leads.filter((lead) => ["hot", "nóng", "tiềm năng cao"].includes(normalize(lead.leadQuality))).length;
  const maxStage = Math.max(1, ...counts.map((stage) => stage.count));
  const canStatus = fieldAccess.readable.has("leadStatus"); const canQuality = fieldAccess.readable.has("leadQuality"); const canQuotation = fieldAccess.readable.has("quotationValueUsd"); const canBooking = fieldAccess.readable.has("bookingValueUsd");
  const totalQuotation = canQuotation ? leads.reduce((sum, lead) => sum + Number(lead.quotationValueUsd ?? 0), 0) : 0;
  const confirmedBooking = canBooking ? leads.filter((lead) => matches(lead.leadStatus, stages[6].aliases)).reduce((sum, lead) => sum + Number(lead.bookingValueUsd ?? 0), 0) : 0;

  const kpis = [
    { label: "Total Leads", value: total, icon: UsersRound, color: "text-sky-700", bg: "bg-sky-50" },
    ...(canStatus ? [{ label: "New Leads", value: newLeads, icon: TrendingUp, color: "text-cyan-700", bg: "bg-cyan-50" }] : []),
    ...(canQuality ? [{ label: "Hot Leads", value: hot, icon: Target, color: "text-orange-700", bg: "bg-orange-50" }] : []),
    ...(canStatus ? [{ label: "Quotation Sent", value: quotationSent, icon: CircleDollarSign, color: "text-violet-700", bg: "bg-violet-50" }, { label: "Confirmed", value: confirmed, icon: ChartNoAxesCombined, color: "text-emerald-700", bg: "bg-emerald-50" }, { label: "Lost", value: lost, icon: ChartNoAxesCombined, color: "text-rose-700", bg: "bg-rose-50" }] : []),
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">La Passion Travel</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{type === "b2b" ? "B2B" : "B2C"} Lead Management Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Tổng hợp hiệu suất Lead theo Date Received và Date Confirmation.</p></div><Button nativeButton={false} render={<Link href={type === "b2b" ? "/b2b-leads" : "/leads"} />} variant="outline"><ArrowLeft />Danh sách Lead {type.toUpperCase()}</Button></div>
    <div className="inline-flex rounded-lg bg-muted p-1"><Link href="/leads/dashboard?type=b2c" className={`rounded-md px-5 py-2 text-sm font-medium ${type === "b2c" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>B2C</Link><Link href="/leads/dashboard?type=b2b" className={`rounded-md px-5 py-2 text-sm font-medium ${type === "b2b" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>B2B</Link></div>
    <Card><CardContent><form className="flex flex-wrap items-end gap-3"><input type="hidden" name="type" value={type} /><label className="space-y-1 text-xs font-medium text-muted-foreground">Date Received từ<Input name="from" type="date" defaultValue={from} /></label><label className="space-y-1 text-xs font-medium text-muted-foreground">Date Received đến<Input name="to" type="date" defaultValue={to} /></label>{canConfirmation && <><label className="space-y-1 text-xs font-medium text-muted-foreground">Date Confirmation từ<Input name="confirmationFrom" type="date" defaultValue={confirmationFrom} /></label><label className="space-y-1 text-xs font-medium text-muted-foreground">Date Confirmation đến<Input name="confirmationTo" type="date" defaultValue={confirmationTo} /></label></>}<Button type="submit"><CalendarDays />Áp dụng</Button><Button nativeButton={false} render={<Link href={`/leads/dashboard?type=${type}`} />} variant="outline">Xóa lọc</Button></form></CardContent></Card>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{kpis.map((item) => { const Icon = item.icon; return <Card key={item.label} className="gap-2"><CardContent><div className={`mb-3 flex size-9 items-center justify-center rounded-lg ${item.bg}`}><Icon className={`size-4 ${item.color}`} /></div><p className="text-sm font-medium text-muted-foreground">{item.label}</p><p className="mt-1 text-3xl font-semibold tracking-tight">{item.value.toLocaleString("vi-VN")}</p></CardContent></Card>; })}</div>
    <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      {canStatus && <Card><CardHeader><CardTitle>Sales Funnel</CardTitle><CardDescription>Phân bổ Lead theo từng trạng thái trong quy trình bán hàng.</CardDescription></CardHeader><CardContent className="space-y-3">{counts.map((stage) => <div key={stage.label} className="grid grid-cols-[120px_1fr_44px] items-center gap-3"><span className="text-sm">{stage.label}</span><div className="h-7 overflow-hidden rounded-md bg-slate-100"><div className="flex h-full min-w-1 items-center rounded-md bg-gradient-to-r from-sky-600 to-blue-400 px-2 text-xs font-medium text-white transition-all" style={{ width: `${Math.max(stage.count ? 4 : 0, stage.count / maxStage * 100)}%` }}>{stage.count > 0 && stage.count}</div></div><span className="text-right text-sm font-semibold">{stage.count}</span></div>)}</CardContent></Card>}
      <Card><CardHeader><CardTitle>Revenue & Conversion</CardTitle><CardDescription>Giá trị báo giá, booking và tỷ lệ chuyển đổi.</CardDescription></CardHeader><CardContent className="space-y-1">{canQuotation && <Metric label="Total Quotation Value" value={money(totalQuotation)} />}{canBooking && <Metric label="Confirmed Booking Value" value={money(confirmedBooking)} />}{canStatus && <><Metric label="Quotation → Booking Rate" value={rate(confirmed, quotationSent)} /><Metric label="Lead → Booking Rate" value={rate(confirmed, total)} /></>}{!canQuotation && !canBooking && !canStatus && <p className="text-sm text-muted-foreground">Vai trò của bạn chưa có quyền đọc các cột dùng cho báo cáo doanh thu và chuyển đổi.</p>}</CardContent></Card>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className="text-lg font-semibold">{value}</span></div>; }
