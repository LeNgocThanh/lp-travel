"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LEAD_EXCEL_COLUMNS } from "@/lib/lead-excel";
import { getLeadFieldAccess, requireResourceAction } from "@/lib/lead-access";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const optionalDate = z.string().trim().transform((value, context) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { context.addIssue({ code: "custom", message: "Ngày không hợp lệ." }); return z.NEVER; }
  return new Date(`${value}T00:00:00.000Z`);
});
const optionalInteger = z.string().trim().transform((value, context) => {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100000) { context.addIssue({ code: "custom", message: "Số lượng không hợp lệ." }); return z.NEVER; }
  return number;
});
const optionalMoney = z.string().trim().transform((value, context) => {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 999999999999.99) { context.addIssue({ code: "custom", message: "Giá trị tiền không hợp lệ." }); return z.NEVER; }
  return value;
});

const leadSchema = z.object({
  leadId: z.string().trim().min(2).max(50), dateReceived: optionalDate, leadSource: optionalText(100), channel: optionalText(100), campaign: optionalText(150), customerName: z.string().trim().min(2).max(200), country: optionalText(100), phone: optionalText(50), whatsapp: optionalText(50), preferredContact: optionalText(100), email: z.union([z.email("Email không hợp lệ."), z.literal("")]).transform((value) => value || null), travelDate: optionalDate, numberOfPax: optionalInteger, adults: optionalInteger, children: optionalInteger, destination: optionalText(300), duration: optionalText(100), travelType: optionalText(100), hotel: optionalText(200), category: optionalText(100), meal: optionalText(300), preference: optionalText(2000), specialRequest: optionalText(3000), budgetUsd: optionalMoney, leadStatus: optionalText(100), dateConfirmation: optionalDate, leadQuality: optionalText(100), assignedToId: optionalText(100), lastContact: optionalDate, nextFollowUp: optionalDate, quotationNo: optionalText(100), quotationValueUsd: optionalMoney, followUpStatus: optionalText(100), bookingStatus: optionalText(100), bookingValueUsd: optionalMoney, paymentStatus: optionalText(100), lostReason: optionalText(1000), remarks: optionalText(3000),
}).refine((data) => data.dateReceived !== null, { message: "Date Received là bắt buộc.", path: ["dateReceived"] }).refine((data) => data.numberOfPax === null || data.adults === null || data.children === null || data.adults + data.children <= data.numberOfPax, { message: "Tổng Adults và Children không được lớn hơn No. of Pax." });

function currentLeadForm(lead: Awaited<ReturnType<typeof prisma.lead.findUnique>>) {
  if (!lead) return {};
  const result: Record<string, string> = {};
  for (const key of Object.keys(leadSchema.shape)) { const value = lead[key as keyof typeof lead]; result[key] = value instanceof Date ? value.toISOString().slice(0, 10) : value === null || value === undefined ? "" : String(value); }
  return result;
}

function comparableLeadValue(value: unknown) {
  return value instanceof Date ? value.toISOString() : value === null || value === undefined ? "" : String(value);
}

function leadDataChanged(current: NonNullable<Awaited<ReturnType<typeof prisma.lead.findUnique>>>, data: Record<string, unknown>) {
  return Object.entries(data).some(([key, value]) => comparableLeadValue(value) !== comparableLeadValue(current[key as keyof typeof current]));
}

function leadNotification(actor: Awaited<ReturnType<typeof requireUser>>, lead: { id: string; leadId: string; customerName: string; assignedToId: string | null }, previousAssigneeId: string | null, changed: boolean) {
  if (!changed || !lead.assignedToId || lead.assignedToId === actor.id) return null;
  const assigned = lead.assignedToId !== previousAssigneeId;
  return { userId: lead.assignedToId, type: assigned ? "LEAD_ASSIGNED" : "LEAD_UPDATED", title: assigned ? `Bạn được giao Lead ${lead.leadId}` : `Lead ${lead.leadId} vừa được cập nhật`, body: lead.customerName, href: `/leads/${lead.id}`, actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName };
}

export async function createLead(formData: FormData) {
  try {
    const actor = await requireUser();
    await requireResourceAction(actor, "LEADS", "CREATE");
    const data = leadSchema.parse(Object.fromEntries(formData));
    if (await prisma.lead.findUnique({ where: { leadId: data.leadId } })) return { error: `Lead ID "${data.leadId}" đã tồn tại. Vui lòng nhập Lead ID khác.` };
    if (data.assignedToId && !(await prisma.user.findFirst({ where: { id: data.assignedToId, active: true } }))) return { error: "Người phụ trách không hợp lệ." };
    await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({ data: { ...data, dateReceived: data.dateReceived!, leadStatus: data.dateConfirmation ? "Confirmed" : data.leadStatus, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName } });
      const notification = leadNotification(actor, lead, null, true);
      if (notification) await tx.notification.create({ data: notification });
    });
    revalidatePath("/leads");
    revalidatePath("/", "layout");
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map((issue) => issue.message).join("; ") };
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { error: "Lead ID đã tồn tại. Vui lòng nhập Lead ID khác." };
    return { error: error instanceof Error ? error.message : "Không thể tạo Lead. Vui lòng thử lại." };
  }
}

export async function updateLead(id: string, formData: FormData) {
  const actor = await requireUser();
  await requireResourceAction(actor, "LEADS", "UPDATE");
  const current = await prisma.lead.findUnique({ where: { id } });
  if (!current) throw new Error("Không tìm thấy Lead.");
  const data = leadSchema.parse({ ...currentLeadForm(current), ...Object.fromEntries(formData) });
  const { writable } = await getLeadFieldAccess(actor);
  for (const [key, value] of Object.entries(data)) if (!writable.has(key) && String(value ?? "") !== String(current[key as keyof typeof current] ?? "")) throw new Error(`Bạn không có quyền sửa trường ${key}.`);
  if (await prisma.lead.findFirst({ where: { leadId: data.leadId, id: { not: id } } })) throw new Error("Lead ID đã tồn tại.");
  if (data.assignedToId && !(await prisma.user.findFirst({ where: { id: data.assignedToId, active: true } }))) throw new Error("Người phụ trách không hợp lệ.");
  const updateData = { ...data, dateReceived: data.dateReceived!, leadStatus: data.dateConfirmation ? "Confirmed" : data.leadStatus };
  const changed = leadDataChanged(current, updateData);
  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({ where: { id }, data: updateData });
    const notification = leadNotification(actor, lead, current.assignedToId, changed);
    if (notification) await tx.notification.create({ data: notification });
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/", "layout");
}

type InlineLeadState = { ok?: boolean; error?: string } | undefined;

export async function updateLeadInline(id: string, expectedUpdatedAt: string, _state: InlineLeadState, formData: FormData): Promise<InlineLeadState> {
  try {
    const actor = await requireUser();
    await requireResourceAction(actor, "LEADS", "UPDATE");
    const expectedDate = new Date(expectedUpdatedAt);
    if (Number.isNaN(expectedDate.getTime())) return { error: "Phiên bản Lead không hợp lệ. Vui lòng tải lại trang." };
    const current = await prisma.lead.findUnique({ where: { id } });
    if (!current) return { error: "Không tìm thấy Lead." };
    const data = leadSchema.parse({ ...currentLeadForm(current), ...Object.fromEntries(formData) });
    const { writable } = await getLeadFieldAccess(actor);
    for (const [key, value] of Object.entries(data)) if (!writable.has(key) && String(value ?? "") !== String(current[key as keyof typeof current] ?? "")) return { error: `Bạn không có quyền sửa trường ${key}.` };
    if (await prisma.lead.findFirst({ where: { leadId: data.leadId, id: { not: id } } })) return { error: "Lead ID đã tồn tại." };
    if (data.assignedToId && !(await prisma.user.findFirst({ where: { id: data.assignedToId, active: true } }))) return { error: "Người phụ trách không hợp lệ." };
    const updateData = { ...data, dateReceived: data.dateReceived!, leadStatus: data.dateConfirmation ? "Confirmed" : data.leadStatus };
    const changed = leadDataChanged(current, updateData);
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.lead.updateMany({ where: { id, updatedAt: expectedDate }, data: updateData });
      if (updateResult.count) {
        const notification = leadNotification(actor, { ...current, ...updateData }, current.assignedToId, changed);
        if (notification) await tx.notification.create({ data: notification });
      }
      return updateResult;
    });
    if (!result.count) return { error: "Lead đã được người khác cập nhật hoặc không còn tồn tại. Vui lòng tải lại trang." };
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map((issue) => issue.message).join("; ") };
    return { error: error instanceof Error ? error.message : "Không thể cập nhật Lead." };
  }
}

export async function deleteLead(id: string) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "DELETE");
  const result = await prisma.lead.deleteMany({ where: { id } });
  if (!result.count) throw new Error("Không tìm thấy Lead hoặc Lead đã bị xóa.");
  revalidatePath("/leads");
}

function excelDate(value: ExcelJS.CellValue, display: string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000)).toISOString().slice(0, 10);
  const text = display.trim();
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const local = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if (local) return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  return text;
}

export async function importLeads(formData: FormData) {
  const actor = await requireUser(); const file = formData.get("file");
  await requireResourceAction(actor, "LEADS", "IMPORT");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Vui lòng chọn file Excel .xlsx.");
  if (file.size > 10 * 1024 * 1024) throw new Error("File import không được vượt quá 10 MB.");
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet("Leads") ?? workbook.worksheets[0]; if (!sheet) throw new Error("File Excel không có worksheet dữ liệu.");
  if (sheet.rowCount > 2001) throw new Error("Mỗi lần chỉ được import tối đa 2.000 dòng.");
  const headerMap = new Map<string, number>(); sheet.getRow(1).eachCell((cell, column) => headerMap.set(cell.text.trim(), column));
  for (const required of ["Lead ID", "Date Received", "Customer Name"]) if (!headerMap.has(required)) throw new Error(`Thiếu cột bắt buộc: ${required}.`);
  const [existing, users] = await Promise.all([prisma.lead.findMany({ select: { leadId: true } }), prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true, username: true } })]);
  const usedIds = new Set(existing.map((item) => item.leadId.toLowerCase())); const userMap = new Map<string, string>(); users.forEach((user) => { userMap.set(user.fullName.trim().toLowerCase(), user.id); userMap.set(user.username.trim().toLowerCase(), user.id); });
  const rows: Prisma.LeadCreateManyInput[] = []; const errors: string[] = []; let skipped = 0;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber); const raw: Record<string, string> = {};
    for (const [key, header] of LEAD_EXCEL_COLUMNS) { const column = headerMap.get(header); const cell = column ? row.getCell(column) : null; raw[key] = cell ? (["dateReceived", "travelDate", "dateConfirmation", "lastContact", "nextFollowUp"].includes(key) ? excelDate(cell.value, cell.text) : cell.text.trim()) : ""; }
    if (!raw.leadId && !raw.customerName && !raw.dateReceived) continue;
    if (usedIds.has(raw.leadId.toLowerCase())) { skipped++; errors.push(`Dòng ${rowNumber}: Lead ID ${raw.leadId || "trống"} đã tồn tại hoặc bị trùng trong file.`); continue; }
    try {
      const assignedTo = raw.assignedTo.trim(); const assignedToId = assignedTo ? userMap.get(assignedTo.toLowerCase()) : null;
      if (assignedTo && !assignedToId) throw new Error(`không tìm thấy user Assigned To: ${assignedTo}`);
      const parsed = leadSchema.parse({ ...raw, assignedToId: assignedToId ?? "" });
      rows.push({ ...parsed, dateReceived: parsed.dateReceived!, leadStatus: parsed.dateConfirmation ? "Confirmed" : parsed.leadStatus, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName }); usedIds.add(parsed.leadId.toLowerCase());
    } catch (error) { skipped++; const message = error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join("; ") : error instanceof Error ? error.message : "dữ liệu không hợp lệ"; errors.push(`Dòng ${rowNumber}: ${message}`); }
  }
  if (rows.length) await prisma.$transaction(async (tx) => {
    await tx.lead.createMany({ data: rows });
    const leads = await tx.lead.findMany({ where: { leadId: { in: rows.map((row) => row.leadId) } }, select: { id: true, leadId: true, customerName: true, assignedToId: true } });
    const notifications = leads.flatMap((lead) => leadNotification(actor, lead, null, true) ?? []);
    if (notifications.length) await tx.notification.createMany({ data: notifications });
  });
  revalidatePath("/leads");
  revalidatePath("/", "layout");
  return { imported: rows.length, skipped, errors: errors.slice(0, 20) };
}
