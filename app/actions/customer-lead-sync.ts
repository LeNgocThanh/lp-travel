"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { departmentIdsWithPermission } from "@/lib/department-permissions";
import { prisma } from "@/lib/prisma";

export type CustomerLeadSyncState = { error?: string; message?: string; created?: number; updates?: { customerId: string; leadId: string; customerCode: string; customerName: string; leadCode: string; changes: { label: string; before: string; after: string }[] }[] } | undefined;

const normalizePhone = (value: string | null) => value?.replace(/\D/g, "") || null;
const normalizeEmail = (value: string | null) => value?.trim().toLowerCase() || null;
const shown = (value: unknown) => value instanceof Date ? value.toLocaleDateString("vi-VN") : value === null || value === undefined || value === "" ? "—" : String(value);

async function requireSyncPermission() {
  const actor = await requireUser();
  const managedIds = await departmentIdsWithPermission(actor, "canManageCustomers");
  if (actor.role !== "ADMIN" && !managedIds?.length) throw new Error("Bạn không có quyền đồng bộ khách hàng.");
  return actor;
}

type MatchCustomer = { id: string; code: string; name: string; phone: string | null; whatsapp: string | null; email: string | null; country: string | null; source: string | null; ownerId: string | null; lastContactAt: Date | null; dateReceived: Date | null };
type SyncLead = { id: string; leadId: string; customerName: string; phone: string | null; whatsapp: string | null; email: string | null; country: string | null; leadSource: string | null; assignedToId: string | null; lastContact: Date | null; dateReceived: Date };

function findMatch(lead: SyncLead, customers: MatchCustomer[]) {
  const phone = normalizePhone(lead.phone); if (phone) { const found = customers.find((item) => normalizePhone(item.phone) === phone); if (found) return found; }
  const whatsapp = normalizePhone(lead.whatsapp); if (whatsapp) { const found = customers.find((item) => normalizePhone(item.whatsapp) === whatsapp); if (found) return found; }
  const email = normalizeEmail(lead.email); if (email) return customers.find((item) => normalizeEmail(item.email) === email) ?? null;
  return null;
}

function leadData(lead: SyncLead) {
  return { name: lead.customerName, ...(lead.phone ? { phone: lead.phone } : {}), ...(lead.whatsapp ? { whatsapp: lead.whatsapp } : {}), ...(lead.email ? { email: lead.email } : {}), ...(lead.country ? { country: lead.country } : {}), ...(lead.leadSource ? { source: lead.leadSource } : {}), ...(lead.assignedToId ? { ownerId: lead.assignedToId } : {}), ...(lead.lastContact ? { lastContactAt: lead.lastContact } : {}), dateReceived: lead.dateReceived };
}

function differences(customer: MatchCustomer, lead: SyncLead) {
  const data = leadData(lead); const labels: Record<string, string> = { name: "Tên khách hàng", phone: "Điện thoại", whatsapp: "WhatsApp", email: "Email", country: "Country", source: "Nguồn khách", ownerId: "Người phụ trách", lastContactAt: "Last Contact", dateReceived: "Date Received" };
  return Object.entries(data).filter(([key, value]) => shown(customer[key as keyof MatchCustomer]) !== shown(value)).map(([key, value]) => ({ label: labels[key] ?? key, before: shown(customer[key as keyof MatchCustomer]), after: shown(value) }));
}

function nextCode(leadCode: string, used: Set<string>) {
  const base = `LEAD-${leadCode}`.toUpperCase().replace(/[^A-Z0-9_-]/g, "-").slice(0, 26) || "LEAD";
  let value = base; let suffix = 1;
  while (used.has(value)) { suffix += 1; value = `${base.slice(0, 30 - String(suffix).length - 1)}-${suffix}`; }
  used.add(value); return value;
}

export async function syncCustomersFromLeads(_: CustomerLeadSyncState, formData: FormData): Promise<CustomerLeadSyncState> {
  try {
    await requireSyncPermission();
    const mode = z.enum(["preview", "confirm"]).parse(formData.get("mode"));
    if (mode === "confirm") {
      const pairs = z.array(z.object({ customerId: z.string().min(1), leadId: z.string().min(1) })).max(2000).parse(JSON.parse(String(formData.get("pairs") ?? "[]")));
      const [customers, leads] = await Promise.all([prisma.customer.findMany(), prisma.lead.findMany({ where: { id: { in: pairs.map((item) => item.leadId) } } })]);
      let updated = 0;
      await prisma.$transaction(async (tx) => { for (const pair of pairs) { const lead = leads.find((item) => item.id === pair.leadId); const customer = lead ? findMatch(lead, customers) : null; if (!lead || customer?.id !== pair.customerId) continue; await tx.customer.update({ where: { id: customer.id }, data: leadData(lead) }); updated += 1; } });
      revalidatePath("/customers"); return { message: `Đã cập nhật ${updated} khách hàng từ Lead.` };
    }

    const range = z.object({ from: z.string().date(), to: z.string().date() }).parse({ from: formData.get("from"), to: formData.get("to") });
    const from = new Date(`${range.from}T00:00:00.000Z`); const to = new Date(`${range.to}T23:59:59.999Z`);
    if (from > to) throw new Error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
    const leads = await prisma.lead.findMany({ where: { OR: [{ createdAt: { gte: from, lte: to } }, { updatedAt: { gte: from, lte: to } }] }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }] });
    const customers = await prisma.customer.findMany(); const usedCodes = new Set(customers.map((item) => item.code)); let created = 0; let skipped = 0;
    const candidates = new Map<string, { customerId: string; leadId: string; customerCode: string; customerName: string; leadCode: string; changes: { label: string; before: string; after: string }[] }>();
    await prisma.$transaction(async (tx) => { for (const lead of leads) { if (!normalizePhone(lead.phone) && !normalizePhone(lead.whatsapp) && !normalizeEmail(lead.email)) { skipped += 1; continue; } const customer = findMatch(lead, customers); if (!customer) { const added = await tx.customer.create({ data: { code: nextCode(lead.leadId, usedCodes), partyType: "PERSON", lifecycle: "LEAD", ...leadData(lead), metadata: { syncedFromLeadId: lead.leadId } } }); customers.push(added); created += 1; continue; } const changes = differences(customer, lead); if (changes.length) candidates.set(customer.id, { customerId: customer.id, leadId: lead.id, customerCode: customer.code, customerName: customer.name, leadCode: lead.leadId, changes }); } });
    revalidatePath("/customers");
    return { created, message: `Đã kiểm tra ${leads.length} Lead, tạo ${created} khách hàng mới${skipped ? ` và bỏ qua ${skipped} Lead không có Phone/WhatsApp/Email` : ""}.`, updates: [...candidates.values()] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể đồng bộ khách hàng từ Lead." };
  }
}
