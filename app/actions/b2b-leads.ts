"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const optionalDate = z.string().trim().transform((value, context) => { if (!value) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { context.addIssue({ code: "custom", message: "Ngày không hợp lệ." }); return z.NEVER; } return new Date(`${value}T00:00:00.000Z`); });
const optionalInteger = z.string().trim().transform((value, context) => { if (!value) return null; const number = Number(value); if (!Number.isInteger(number) || number < 0 || number > 100000) { context.addIssue({ code: "custom", message: "Số lượng không hợp lệ." }); return z.NEVER; } return number; });
const optionalMoney = z.string().trim().transform((value, context) => { if (!value) return null; const number = Number(value); if (!Number.isFinite(number) || number < 0 || number > 999999999999.99) { context.addIssue({ code: "custom", message: "Giá trị tiền không hợp lệ." }); return z.NEVER; } return value; });
const schema = z.object({
  leadId: z.string().trim().min(2).max(50), dateReceived: optionalDate, leadSource: optionalText(100), channel: optionalText(100), campaign: optionalText(150), customerName: z.string().trim().min(2).max(200), country: optionalText(100), phone: optionalText(50), whatsapp: optionalText(50), preferredContact: optionalText(100), email: z.union([z.email("Email không hợp lệ."), z.literal("")]).transform((value) => value || null), travelDate: optionalDate, numberOfPax: optionalInteger, adults: optionalInteger, children: optionalInteger, destination: optionalText(300), duration: optionalText(100), travelType: optionalText(100), hotel: optionalText(200), category: optionalText(100), meal: optionalText(300), preference: optionalText(2000), specialRequest: optionalText(3000), budgetUsd: optionalMoney, leadStatus: optionalText(100), dateConfirmation: optionalDate, leadQuality: optionalText(100), assignedToId: optionalText(100), lastContact: optionalDate, nextFollowUp: optionalDate, quotationNo: optionalText(100), quotationValueUsd: optionalMoney, followUpStatus: optionalText(100), bookingStatus: optionalText(100), bookingValueUsd: optionalMoney, paymentStatus: optionalText(100), lostReason: optionalText(1000), remarks: optionalText(3000),
}).refine((data) => data.dateReceived !== null, { message: "Date Received là bắt buộc.", path: ["dateReceived"] }).refine((data) => data.numberOfPax === null || data.adults === null || data.children === null || data.adults + data.children <= data.numberOfPax, { message: "Tổng Adults và Children không được lớn hơn No. of Pax." });

function currentForm(lead: Awaited<ReturnType<typeof prisma.b2BLead.findUnique>>) { if (!lead) return {}; const result: Record<string, string> = {}; for (const key of Object.keys(schema.shape)) { const value = lead[key as keyof typeof lead]; result[key] = value instanceof Date ? value.toISOString().slice(0, 10) : value === null || value === undefined ? "" : String(value); } return result; }
async function validateAssignee(id: string | null) { if (id && !(await prisma.user.findFirst({ where: { id, active: true } }))) throw new Error("Người phụ trách không hợp lệ."); }
function notify(actor: Awaited<ReturnType<typeof requireUser>>, lead: { id: string; leadId: string; customerName: string; assignedToId: string | null }, previous: string | null) { if (!lead.assignedToId || lead.assignedToId === actor.id) return null; const assigned = lead.assignedToId !== previous; return { userId: lead.assignedToId, type: assigned ? "B2B_LEAD_ASSIGNED" : "B2B_LEAD_UPDATED", title: assigned ? `Bạn được giao Lead B2B ${lead.leadId}` : `Lead B2B ${lead.leadId} vừa được cập nhật`, body: lead.customerName, href: `/b2b-leads/${lead.id}`, actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName }; }

export async function createB2BLead(formData: FormData) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "CREATE");
  const data = schema.parse(Object.fromEntries(formData)); await validateAssignee(data.assignedToId);
  if (await prisma.b2BLead.findUnique({ where: { leadId: data.leadId } })) throw new Error("Lead ID B2B đã tồn tại.");
  const lead = await prisma.b2BLead.create({ data: { ...data, leadSource: data.leadSource || "B2B", dateReceived: data.dateReceived!, leadStatus: data.dateConfirmation ? "Confirmed" : data.leadStatus, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName } });
  const notification = notify(actor, lead, null); if (notification) await prisma.notification.create({ data: notification });
  revalidatePath("/b2b-leads"); revalidatePath("/", "layout"); redirect(`/b2b-leads/${lead.id}`);
}

export async function updateB2BLead(id: string, formData: FormData) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE");
  const current = await prisma.b2BLead.findUnique({ where: { id } }); if (!current) throw new Error("Không tìm thấy Lead B2B.");
  const data = schema.parse({ ...currentForm(current), ...Object.fromEntries(formData) }); const { writable } = await getLeadFieldAccess(actor);
  for (const [key, value] of Object.entries(data)) if (!writable.has(key) && String(value ?? "") !== String(current[key as keyof typeof current] ?? "")) throw new Error(`Bạn không có quyền sửa trường ${key}.`);
  await validateAssignee(data.assignedToId); if (await prisma.b2BLead.findFirst({ where: { leadId: data.leadId, id: { not: id } } })) throw new Error("Lead ID B2B đã tồn tại.");
  const lead = await prisma.b2BLead.update({ where: { id }, data: { ...data, leadSource: data.leadSource || "B2B", dateReceived: data.dateReceived!, leadStatus: data.dateConfirmation ? "Confirmed" : data.leadStatus } });
  if (lead.updatedAt.getTime() !== current.updatedAt.getTime()) { const notification = notify(actor, lead, current.assignedToId); if (notification) await prisma.notification.create({ data: notification }); }
  revalidatePath("/b2b-leads"); revalidatePath(`/b2b-leads/${id}`); revalidatePath("/", "layout"); redirect(`/b2b-leads/${id}`);
}

export async function deleteB2BLead(id: string) { const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "DELETE"); await prisma.b2BLead.delete({ where: { id } }); revalidatePath("/b2b-leads"); }
