import "server-only";
import { prisma } from "@/lib/prisma";

export async function createCustomerFollowUpNotifications(now = new Date()) {
  const upcomingUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const customers = await prisma.customer.findMany({
    where: { active: true, lifecycle: { not: "INACTIVE" }, ownerId: { not: null }, owner: { active: true }, nextFollowUpAt: { lte: upcomingUntil } },
    select: { id: true, code: true, name: true, ownerId: true, nextFollowUpAt: true },
  });
  if (!customers.length) return { candidates: 0, created: 0 };
  const result = await prisma.notification.createMany({
    data: customers.map((customer) => ({
      userId: customer.ownerId!,
      type: "CUSTOMER_FOLLOW_UP_DUE",
      title: customer.nextFollowUpAt! < now ? `Quá hạn chăm sóc: ${customer.name}` : `Sắp đến hạn chăm sóc: ${customer.name}`,
      body: `${customer.code} · Hạn ${customer.nextFollowUpAt!.toLocaleString("vi-VN")}`,
      href: `/customers/${customer.id}`,
      dedupeKey: `CUSTOMER_FOLLOW_UP:${customer.id}:${customer.ownerId}:${customer.nextFollowUpAt!.toISOString()}`,
    })),
    skipDuplicates: true,
  });
  return { candidates: customers.length, created: result.count };
}
