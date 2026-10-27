import "server-only";
import { prisma } from "@/lib/prisma";

function dateInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00.000Z`);
}

export async function createLeadTravelDateNotifications(now = new Date()) {
  const timeZone = process.env.APP_TIME_ZONE || "Asia/Ho_Chi_Minh";
  const today = dateInTimeZone(now, timeZone);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const leads = await prisma.lead.findMany({
    where: { assignedToId: { not: null }, assignedTo: { active: true }, travelDate: { in: [today, tomorrow] } },
    select: { id: true, leadId: true, customerName: true, destination: true, travelDate: true, assignedToId: true },
  });
  if (!leads.length) return { candidates: 0, created: 0 };
  const result = await prisma.notification.createMany({
    data: leads.map((lead) => {
      const isToday = lead.travelDate!.getTime() === today.getTime();
      return {
        userId: lead.assignedToId!,
        type: isToday ? "LEAD_TRAVEL_DATE_TODAY" : "LEAD_TRAVEL_DATE_TOMORROW",
        title: isToday ? `Lead ${lead.leadId} bắt đầu chuyến đi hôm nay` : `Lead ${lead.leadId} sẽ bắt đầu chuyến đi ngày mai`,
        body: [lead.customerName, lead.destination].filter(Boolean).join(" · "),
        href: `/leads/${lead.id}`,
        dedupeKey: `LEAD_TRAVEL_DATE:${lead.id}:${lead.assignedToId}:${lead.travelDate!.toISOString()}:${isToday ? "TODAY" : "TOMORROW"}`,
      };
    }),
    skipDuplicates: true,
  });
  return { candidates: leads.length, created: result.count };
}
