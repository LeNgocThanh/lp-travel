import Link from "next/link";
import { ArrowRight, CalendarClock, ChartNoAxesCombined, CheckCircle2, CircleDollarSign, ClockAlert, ContactRound, Database, Plus, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

function date(value: Date | null) {
  return value ? value.toLocaleDateString("vi-VN") : "—";
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const [canRead, canCreate, fieldAccess] = await Promise.all([
    hasResourceAction(user, "LEADS", "READ"),
    hasResourceAction(user, "LEADS", "CREATE"),
    getLeadFieldAccess(user),
  ]);

  if (!canRead) {
    return <Card><CardHeader><CardTitle>Xin chào, {user.fullName}</CardTitle><CardDescription>Bạn chưa được cấp quyền xem dữ liệu Lead.</CardDescription></CardHeader></Card>;
  }

  const [recent30DayLeads, recentLeads, totalLeads] = await Promise.all([
    prisma.lead.findMany({
      where: { dateReceived: { gte: thirtyDaysAgo, lte: now } },
      select: { dateConfirmation: true, quotationValueUsd: true, travelDate: true, nextFollowUp: true },
    }),
    prisma.lead.findMany({
      include: { assignedTo: { select: { fullName: true } } },
      orderBy: [{ dateReceived: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.lead.count(),
  ]);

  const canCustomer = fieldAccess.readable.has("customerName");
  const canStatus = fieldAccess.readable.has("leadStatus");
  const canConfirmation = fieldAccess.readable.has("dateConfirmation");
  const canQuotation = fieldAccess.readable.has("quotationValueUsd");
  const canTravelDate = fieldAccess.readable.has("travelDate");
  const canFollowUp = fieldAccess.readable.has("nextFollowUp");
  const canAssigned = fieldAccess.readable.has("assignedToId");
  const confirmedCount = recent30DayLeads.filter((lead) => lead.dateConfirmation).length;
  const quotationTotal = recent30DayLeads.reduce((sum, lead) => sum + Number(lead.quotationValueUsd ?? 0), 0);
  const expiredCount = recent30DayLeads.filter((lead) => !lead.dateConfirmation && lead.travelDate && lead.travelDate < today).length;
  const overdueFollowUps = recent30DayLeads.filter((lead) => !lead.dateConfirmation && lead.nextFollowUp && lead.nextFollowUp < today).length;
  const stats = [
    { label: "Lead trong 30 ngày", value: recent30DayLeads.length.toLocaleString("vi-VN"), detail: `${totalLeads.toLocaleString("vi-VN")} Lead toàn hệ thống`, icon: ContactRound, iconClass: "bg-sky-50 text-sky-600", visible: true },
    { label: "Đã xác nhận", value: confirmedCount.toLocaleString("vi-VN"), detail: "Có Date Confirmation", icon: CheckCircle2, iconClass: "bg-emerald-50 text-emerald-600", visible: canConfirmation },
    { label: "Tổng báo giá", value: usd(quotationTotal), detail: "Quotation Value trong 30 ngày", icon: CircleDollarSign, iconClass: "bg-amber-50 text-amber-600", visible: canQuotation },
    { label: "Đã quá Travel Date", value: expiredCount.toLocaleString("vi-VN"), detail: "Lead chưa xác nhận", icon: ClockAlert, iconClass: "bg-red-50 text-red-600", visible: canConfirmation && canTravelDate },
  ].filter((item) => item.visible);

  return <div className="space-y-7">
    <section className="rounded-2xl bg-gradient-to-r from-sky-700 to-cyan-600 p-6 text-white shadow-sm">
      <Badge variant="secondary" className="bg-white/15 text-white">Lead Workspace</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Xin chào, {user.fullName}</h1>
      <p className="mt-2 max-w-2xl text-sm text-sky-50">Theo dõi Lead, tiến độ xác nhận, báo giá và lịch chăm sóc trên một màn hình.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {canCreate && <Button nativeButton={false} render={<Link href="/leads/new" />} variant="secondary">Tạo Lead <Plus /></Button>}
        <Button nativeButton={false} render={<Link href="/leads" />} variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">Danh sách Lead <ArrowRight /></Button>
      </div>
    </section>

    <section className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${stats.length > 2 ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
      {stats.map(({ icon: Icon, ...item }) => <Card key={item.label} className="flex-row items-center gap-3 p-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}><Icon className="size-5" /></span>
        <div><p className="text-2xl font-semibold leading-none">{item.value}</p><p className="mt-1 text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p></div>
      </Card>)}
    </section>

    {canFollowUp && overdueFollowUps > 0 && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-3"><CalendarClock className="size-5 text-amber-700" /><div><p className="font-medium text-amber-900">Có {overdueFollowUps} Lead quá hạn Next Follow-up trong 30 ngày gần nhất</p><p className="text-sm text-amber-800">Mở danh sách Lead để kiểm tra và cập nhật lịch liên hệ.</p></div></div>
      <Button nativeButton={false} render={<Link href="/leads" />} size="sm" variant="outline">Xem danh sách</Button>
    </section>}

    <section>
      <div className="mb-3"><h2 className="text-lg font-semibold">Quản lý Lead</h2><p className="text-sm text-muted-foreground">Các chức năng và báo cáo trực tiếp từ dữ liệu Lead.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/leads"><Card className="h-full gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><ContactRound className="size-7 text-sky-600" /><div><h3 className="font-semibold">Danh sách Lead</h3><p className="mt-1 text-sm text-muted-foreground">Tìm kiếm, lọc, nhập và quản lý Lead.</p></div></Card></Link>
        <Link href="/leads/dashboard"><Card className="h-full gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><ChartNoAxesCombined className="size-7 text-indigo-600" /><div><h3 className="font-semibold">Dashboard Lead</h3><p className="mt-1 text-sm text-muted-foreground">Phễu bán hàng, doanh thu và tỷ lệ chuyển đổi.</p></div></Card></Link>
        <Link href="/performance"><Card className="h-full gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><UserRoundCheck className="size-7 text-emerald-600" /><div><h3 className="font-semibold">Hiệu suất</h3><p className="mt-1 text-sm text-muted-foreground">Theo dõi năng suất cá nhân và phòng ban.</p></div></Card></Link>
        {user.role === "ADMIN" && <Link href="/admin/channels"><Card className="h-full gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><Database className="size-7 text-amber-600" /><div><h3 className="font-semibold">Master Data</h3><p className="mt-1 text-sm text-muted-foreground">Quản lý dữ liệu nền sử dụng cho Lead.</p></div></Card></Link>}
      </div>
    </section>

    <Card>
      <CardHeader className="flex-row items-start justify-between"><div><CardTitle>Lead gần đây</CardTitle><CardDescription>8 Lead có Date Received mới nhất.</CardDescription></div><Button nativeButton={false} render={<Link href="/leads" />} variant="ghost" size="sm">Xem tất cả</Button></CardHeader>
      <CardContent className="space-y-2">
        {recentLeads.map((lead) => <Link key={lead.id} href={`/leads/${lead.id}`} className="grid gap-2 rounded-lg border p-3 transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0"><p className="truncate font-medium">{fieldAccess.readable.has("leadId") ? lead.leadId : "Lead"}{canCustomer ? ` · ${lead.customerName}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">Date Received: {fieldAccess.readable.has("dateReceived") ? date(lead.dateReceived) : "—"}{canAssigned ? ` · Assigned To: ${lead.assignedTo?.fullName ?? "Chưa phân công"}` : ""}</p></div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{canStatus && lead.leadStatus && <Badge variant="secondary">{lead.leadStatus}</Badge>}{canConfirmation && lead.dateConfirmation && <Badge variant="outline">Confirmed {date(lead.dateConfirmation)}</Badge>}{canQuotation && <span className="text-sm font-medium">{usd(Number(lead.quotationValueUsd ?? 0))}</span>}</div>
        </Link>)}
        {!recentLeads.length && <p className="text-sm text-muted-foreground">Chưa có Lead nào.</p>}
      </CardContent>
    </Card>
  </div>;
}
