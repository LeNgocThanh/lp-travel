import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, CircleDollarSign, ClockAlert, UserPlus, UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

type Period = "week" | "previous-week" | "month" | "previous-month" | "quarter" | "previous-quarter";
type PerformanceRow = { id: string; name: string; departments: string; assigned: number; created: number; confirmed: number; quotation: number; overdue: number };

function periodRange(period: Period, now = new Date()) {
  const year = now.getUTCFullYear(); const month = now.getUTCMonth(); const day = now.getUTCDate();
  if (period === "week" || period === "previous-week") { const weekday = now.getUTCDay() || 7; const currentWeek = new Date(Date.UTC(year, month, day - weekday + 1)); const from = new Date(currentWeek); if (period === "previous-week") from.setUTCDate(from.getUTCDate() - 7); const to = new Date(from); to.setUTCDate(to.getUTCDate() + 7); return { from, to }; }
  if (period === "quarter" || period === "previous-quarter") { const quarterMonth = Math.floor(month / 3) * 3; const offset = period === "previous-quarter" ? -3 : 0; return { from: new Date(Date.UTC(year, quarterMonth + offset, 1)), to: new Date(Date.UTC(year, quarterMonth + offset + 3, 1)) }; }
  if (period === "previous-month") return { from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
  return { from: new Date(Date.UTC(year, month, 1)), to: new Date(Date.UTC(year, month + 1, 1)) };
}

function descendantDepartmentIds(departments: { id: string; parentId: string | null }[], roots: string[]) {
  const result = new Set(roots); let changed = true;
  while (changed) { changed = false; for (const department of departments) if (department.parentId && result.has(department.parentId) && !result.has(department.id)) { result.add(department.id); changed = true; } }
  return [...result];
}

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const displayDate = (value: Date) => value.toLocaleDateString("vi-VN", { timeZone: "UTC" });

export default async function PerformanceDashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireUser();
  const [canRead, fieldAccess, params] = await Promise.all([hasResourceAction(user, "LEADS", "READ"), getLeadFieldAccess(user), searchParams]);
  if (!canRead) redirect("/");
  const allowedPeriods: Period[] = ["week", "previous-week", "month", "previous-month", "quarter", "previous-quarter"];
  const period: Period = allowedPeriods.includes(params.period as Period) ? params.period as Period : "month";
  const { from, to } = periodRange(period); const today = new Date(); const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const isAdmin = user.role === "ADMIN";
  const managerMemberships = isAdmin ? [] : await prisma.departmentMembership.findMany({ where: { userId: user.id, role: "MANAGER", department: { active: true } }, select: { departmentId: true } });
  const isManager = managerMemberships.length > 0;
  const managedDepartmentIds = isManager ? descendantDepartmentIds(await prisma.department.findMany({ where: { active: true }, select: { id: true, parentId: true } }), managerMemberships.map((item) => item.departmentId)) : [];
  const scopedUsers = await prisma.user.findMany({ where: { active: true, ...(!isAdmin && !isManager ? { id: user.id } : isManager ? { memberships: { some: { departmentId: { in: managedDepartmentIds } } } } : {}) }, select: { id: true, fullName: true, memberships: { where: { department: { active: true } }, select: { isPrimary: true, department: { select: { name: true } } }, orderBy: { isPrimary: "desc" } } }, orderBy: { fullName: "asc" } });
  const scopedUserIds = scopedUsers.map((item) => item.id);
  const dateReceived: Prisma.DateTimeFilter = { gte: from, lt: to };
  const scopeWhere: Prisma.LeadWhereInput = isAdmin ? {} : { OR: [{ assignedToId: { in: scopedUserIds } }, { createdById: { in: scopedUserIds } }] };
  const leads = await prisma.lead.findMany({ where: { dateReceived, ...scopeWhere }, select: { assignedToId: true, createdById: true, dateConfirmation: true, travelDate: true, quotationValueUsd: true } });
  const rows: PerformanceRow[] = scopedUsers.map((member) => {
    const assigned = leads.filter((lead) => lead.assignedToId === member.id); const created = leads.filter((lead) => lead.createdById === member.id);
    return { id: member.id, name: member.fullName, departments: member.memberships.map((membership) => membership.department.name).join(", ") || "Chưa có phòng ban", assigned: assigned.length, created: created.length, confirmed: assigned.filter((lead) => lead.dateConfirmation !== null).length, quotation: assigned.reduce((sum, lead) => sum + Number(lead.quotationValueUsd ?? 0), 0), overdue: assigned.filter((lead) => lead.dateConfirmation === null && lead.travelDate !== null && lead.travelDate < todayUtc).length };
  });
  if (user.root) rows.unshift({ id: "root", name: user.fullName, departments: "Quản trị hệ thống", assigned: leads.filter((lead) => lead.assignedToId === "root").length, created: leads.filter((lead) => lead.createdById === "root").length, confirmed: leads.filter((lead) => lead.assignedToId === "root" && lead.dateConfirmation !== null).length, quotation: leads.filter((lead) => lead.assignedToId === "root").reduce((sum, lead) => sum + Number(lead.quotationValueUsd ?? 0), 0), overdue: leads.filter((lead) => lead.assignedToId === "root" && lead.dateConfirmation === null && lead.travelDate !== null && lead.travelDate < todayUtc).length });
  rows.sort((a, b) => b.assigned - a.assigned || b.confirmed - a.confirmed || a.name.localeCompare(b.name, "vi"));
  const totals = rows.reduce((result, row) => ({ assigned: result.assigned + row.assigned, created: result.created + row.created, confirmed: result.confirmed + row.confirmed, quotation: result.quotation + row.quotation, overdue: result.overdue + row.overdue }), { assigned: 0, created: 0, confirmed: 0, quotation: 0, overdue: 0 });
  const canConfirmation = fieldAccess.readable.has("dateConfirmation"); const canQuotation = fieldAccess.readable.has("quotationValueUsd"); const canTravelDate = fieldAccess.readable.has("travelDate");
  const periodLabel = { week: "Tuần này", "previous-week": "Tuần trước", month: "Tháng này", "previous-month": "Tháng trước", quarter: "Quý này", "previous-quarter": "Quý trước" }[period];
  const cards = [{ label: "Lead đang được assign", value: totals.assigned.toLocaleString("vi-VN"), icon: UsersRound, color: "bg-sky-50 text-sky-700" }, { label: "Lead đã tạo", value: totals.created.toLocaleString("vi-VN"), icon: UserPlus, color: "bg-violet-50 text-violet-700" }, ...(canConfirmation ? [{ label: "Assigned đã Confirmed", value: totals.confirmed.toLocaleString("vi-VN"), icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" }] : []), ...(canQuotation ? [{ label: "Quotation Value", value: money(totals.quotation), icon: CircleDollarSign, color: "bg-amber-50 text-amber-700" }] : []), ...(canConfirmation && canTravelDate ? [{ label: "Chưa Confirmed, quá Travel Date", value: totals.overdue.toLocaleString("vi-VN"), icon: ClockAlert, color: "bg-rose-50 text-rose-700" }] : [])];

  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Work Performance</p><h1 className="mt-1 text-2xl font-semibold">Dashboard năng suất Lead</h1><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Toàn bộ nhân viên" : isManager ? "Nhân viên thuộc cây phòng ban bạn quản lý" : "Hiệu suất cá nhân"} · Date Received từ {displayDate(from)} đến {displayDate(new Date(to.getTime() - 1))}.</p></div><form className="flex items-center gap-2"><select name="period" defaultValue={period} className="h-9 rounded-md border bg-white px-3 text-sm"><option value="week">Tuần này</option><option value="previous-week">Tuần trước</option><option value="month">Tháng này</option><option value="previous-month">Tháng trước</option><option value="quarter">Quý này</option><option value="previous-quarter">Quý trước</option></select><Button type="submit"><CalendarClock />Xem</Button></form></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card) => { const Icon = card.icon; return <Card key={card.label}><CardContent><div className={`mb-3 flex size-9 items-center justify-center rounded-lg ${card.color}`}><Icon className="size-4" /></div><p className="text-sm text-muted-foreground">{card.label}</p><p className="mt-1 text-2xl font-semibold">{card.value}</p></CardContent></Card>; })}</div><Card><CardHeader><CardTitle>Năng suất theo nhân viên</CardTitle><CardDescription>{periodLabel}, lọc theo Date Received. Lead được tạo và Lead được assign là hai chỉ số độc lập.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-3">Nhân viên</th><th className="p-3">Phòng ban</th><th className="p-3 text-right">Được assign</th><th className="p-3 text-right">Đã tạo</th>{canConfirmation && <th className="p-3 text-right">Confirmed</th>}{canQuotation && <th className="p-3 text-right">Quotation Value</th>}{canConfirmation && canTravelDate && <th className="p-3 text-right">Quá Travel Date</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b"><td className="p-3 font-medium">{row.name}</td><td className="p-3 text-muted-foreground">{row.departments}</td><td className="p-3 text-right">{row.assigned}</td><td className="p-3 text-right">{row.created}</td>{canConfirmation && <td className="p-3 text-right font-medium text-emerald-700">{row.confirmed}</td>}{canQuotation && <td className="p-3 text-right">{money(row.quotation)}</td>}{canConfirmation && canTravelDate && <td className="p-3 text-right font-medium text-rose-700">{row.overdue}</td>}</tr>)}{!rows.length && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Không có nhân viên trong phạm vi xem.</td></tr>}</tbody></table></div></CardContent></Card></div>;
}
