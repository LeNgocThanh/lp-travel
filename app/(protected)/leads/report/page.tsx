import { redirect } from "next/navigation";
import { LeadReportBuilder } from "@/components/lead-report-builder";
import { requireUser } from "@/lib/auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

type SearchParams = { from?: string; to?: string; leadSource?: string };
const validDate = (value: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");
const normalize = (value: string | null) => value?.trim().toLocaleLowerCase("vi") || "chưa có status";
const percent = (count: number, total: number) => total ? `${(count / total * 100).toFixed(1)}%` : "0%";
const inputDate = (value: Date) => value.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

export default async function LeadReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser(); if (!(await hasResourceAction(user, "LEADS", "READ"))) redirect("/");
  const params = await searchParams; const now = new Date(); const sixDaysAgo = new Date(now.getTime() - 6 * 86400000);
  const from = validDate(params.from) ? params.from! : inputDate(sixDaysAgo); const to = validDate(params.to) ? params.to! : inputDate(now);
  const leadSource = params.leadSource?.trim() ?? "";
  const fromDate = new Date(`${from}T00:00:00.000Z`); const toDate = new Date(`${to}T23:59:59.999Z`);
  const [leads, oldBookings, masterLeadSources, usedLeadSources] = await Promise.all([
    prisma.lead.findMany({ where: { dateReceived: { gte: fromDate, lte: toDate }, ...(leadSource ? { leadSource } : {}) }, orderBy: [{ dateReceived: "asc" }, { leadId: "asc" }], select: { leadId: true, dateReceived: true, customerName: true, leadStatus: true, channel: true, country: true, numberOfPax: true, leadQuality: true } }),
    prisma.lead.count({ where: { dateReceived: { lt: fromDate }, dateConfirmation: { gte: fromDate, lte: toDate }, ...(leadSource ? { leadSource } : {}) } }),
    prisma.leadSource.findMany({ where: { active: true }, select: { name: true } }),
    prisma.lead.findMany({ distinct: ["leadSource"], where: { leadSource: { not: null } }, select: { leadSource: true } }),
  ]);
  const leadSources = [...new Set([...masterLeadSources.map((item) => item.name.trim()), ...usedLeadSources.map((item) => item.leadSource?.trim()).filter((item): item is string => Boolean(item))])].filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"));
  const grouped = (values: (string | null)[]) => [...values.reduce((map, value) => { const label = value?.trim() || "Chưa có"; const key = normalize(value); const current = map.get(key); map.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 }); return map; }, new Map<string, { label: string; count: number }>()).values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
  const statuses = grouped(leads.map((lead) => lead.leadStatus)); const channels = grouped(leads.map((lead) => lead.channel)); const qualities = grouped(leads.map((lead) => lead.leadQuality));
  const statusCount = (names: string[]) => leads.filter((lead) => names.includes(normalize(lead.leadStatus))).length;
  const quotationSent = statusCount(["quotation sent", "đã gửi báo giá"]); const invalid = statusCount(["invalid number", "số không hợp lệ"]); const confirmed = statusCount(["confirmed", "xác nhận", "đã xác nhận"]); const topStatus = statuses[0];
  const topStatusLabel = topStatus?.label === "Chưa có" ? "Chưa có Status" : topStatus?.label;
  const invalidRate = leads.length ? invalid / leads.length * 100 : 0;
  const autoRemarks = [
    `Từ ${new Date(`${from}T00:00:00Z`).toLocaleDateString("vi-VN", { timeZone: "UTC" })}–${new Date(`${to}T00:00:00Z`).toLocaleDateString("vi-VN", { timeZone: "UTC" })} có ${leads.length} lead mới.${topStatus ? ` Phần lớn đang ${topStatusLabel} (${topStatus.count}).` : ""} ${quotationSent ? `Có ${quotationSent} lead đã gửi quotation – cần tiếp tục đẩy nhanh follow-up.` : "Chưa có lead gửi quotation – cần đẩy nhanh follow-up."}`,
    `Tỷ lệ Invalid Number trong nhóm lead mới là ${invalid}/${leads.length} (${percent(invalid, leads.length)}). ${invalidRate > 10 ? "Cần siết quy trình lấy số WhatsApp ngay từ tin nhắn đầu." : "Quy trình lấy số WhatsApp đang rất tốt, cần tiếp tục phát huy."}`,
  ];
  return <LeadReportBuilder from={from} to={to} leadSource={leadSource} leadSources={leadSources} data={{ total: leads.length, oldBookings, quotationSent, invalid, confirmed, statuses: statuses.map((item) => ({ ...item, percent: percent(item.count, leads.length) })), channels: channels.map((item) => ({ ...item, percent: percent(item.count, leads.length) })), qualities, leads: leads.map((lead) => ({ date: lead.dateReceived.toISOString().slice(0, 10), leadId: lead.leadId, customerName: lead.customerName, status: lead.leadStatus, channel: lead.channel, country: lead.country, pax: lead.numberOfPax })), autoRemarks }} />;
}
