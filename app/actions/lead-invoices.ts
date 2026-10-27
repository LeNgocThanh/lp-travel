"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const schema = z.object({ invoiceNumber: z.string().trim().min(2).max(50), billTo: z.string().trim().min(2).max(200), contact: optional(50), email: z.union([z.email(), z.literal("")]).transform((value) => value || null), bookingCode: z.string().trim().min(1).max(100), dueDate: optional(10), rowCount: z.coerce.number().int().min(1).max(50), paymentOptionIds: z.array(z.string().trim().min(1).max(100)).max(20), headerTemplateId: optional(100), footerTemplateId: optional(100) });
const itemSchema = z.object({ description: z.string().trim().min(1).max(2000), quantity: z.coerce.number().int().min(1).max(100000), unit: z.string().trim().min(1).max(30), amountUsd: z.coerce.number().min(0).max(999999999999) });
function internationalPhone(value: string | null | undefined) { const digits = value?.replace(/\D/g, "") ?? ""; if (!digits) return null; if (digits.startsWith("84")) return `+${digits}`; if (digits.startsWith("0")) return `+84${digits.slice(1)}`; return `+84${digits}`; }

async function snapshots(headerTemplateId: string | null, footerTemplateId: string | null) {
  const ids = [headerTemplateId, footerTemplateId].filter((value): value is string => !!value);
  const templates = await prisma.documentTemplate.findMany({ where: { id: { in: ids }, active: true } });
  const header = templates.find((item) => item.id === headerTemplateId && item.type === "HEADER"); const footer = templates.find((item) => item.id === footerTemplateId && item.type === "FOOTER");
  if (headerTemplateId && !header) throw new Error("Header không hợp lệ."); if (footerTemplateId && !footer) throw new Error("Footer không hợp lệ.");
  return { headerTemplateId: header?.id ?? null, headerContent: header?.content ?? null, headerImageFolderId: header?.imageFolderId ?? null, headerImageStoredName: header?.imageStoredName ?? null, headerImageMimeType: header?.imageMimeType ?? null, headerImageAlt: header?.imageAlt ?? null, footerTemplateId: footer?.id ?? null, footerContent: footer?.content ?? null, footerImageFolderId: footer?.imageFolderId ?? null, footerImageStoredName: footer?.imageStoredName ?? null, footerImageMimeType: footer?.imageMimeType ?? null, footerImageAlt: footer?.imageAlt ?? null };
}

export async function saveLeadInvoice(leadId: string, formData: FormData) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE"); const { readable } = await getLeadFieldAccess(actor);
  if (!["leadId", "customerName", "phone", "whatsapp", "email", "dateConfirmation", "destination", "numberOfPax", "quotationValueUsd", "assignedToId"].every((field) => readable.has(field))) throw new Error("Bạn không có quyền đọc đủ dữ liệu để tạo Invoice.");
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, dateConfirmation: true, assignedTo: { select: { fullName: true, phoneNumber: true, email: true } }, invoice: { select: { id: true } }, estimate: { include: { revenueItems: { orderBy: { displayOrder: "asc" } } } } } }); if (!lead) throw new Error("Không tìm thấy Lead."); if (!lead.assignedTo) throw new Error("Lead chưa có Assigned To. Vui lòng phân công người phụ trách trước khi lưu Invoice.");
  const data = schema.parse({ invoiceNumber: formData.get("invoiceNumber"), billTo: formData.get("billTo"), contact: String(formData.get("contact") ?? ""), email: String(formData.get("email") ?? ""), bookingCode: formData.get("bookingCode"), dueDate: String(formData.get("dueDate") ?? ""), rowCount: formData.get("rowCount"), paymentOptionIds: [...new Set(formData.getAll("paymentOptionId").map(String))], headerTemplateId: String(formData.get("headerTemplateId") ?? ""), footerTemplateId: String(formData.get("footerTemplateId") ?? "") });
  const items = Array.from({ length: data.rowCount }, (_, index) => itemSchema.parse({ description: formData.get(`description_${index}`), quantity: formData.get(`quantity_${index}`), unit: formData.get(`unit_${index}`), amountUsd: formData.get(`amountUsd_${index}`) }));
  const payments = data.paymentOptionIds.length ? await prisma.invoicePaymentOption.findMany({ where: { id: { in: data.paymentOptionIds }, active: true } }) : []; if (payments.length !== data.paymentOptionIds.length) throw new Error("Payment Option không hợp lệ.");
  const paymentMap = new Map(payments.map((item) => [item.id, item])); const selectedPayments = data.paymentOptionIds.map((id) => paymentMap.get(id)!);
  const [templateData, setting] = await Promise.all([snapshots(data.headerTemplateId, data.footerTemplateId), prisma.invoiceSetting.findUnique({ where: { id: "default" } })]);
  const depositPercent = Number(setting?.depositPercent ?? 50); const depositDueDays = setting?.depositDueDays ?? 50; const amount = Math.round(items.reduce((sum, item) => sum + item.amountUsd, 0) * 100) / 100; const deposit = Math.round(amount * depositPercent) / 100;
  const dueDate = data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null; const depositDueDate = dueDate ? new Date(dueDate) : null; if (depositDueDate) depositDueDate.setUTCDate(depositDueDate.getUTCDate() - depositDueDays);
  const payload = { invoiceNumber: data.invoiceNumber, billTo: data.billTo, contact: data.contact, email: data.email, bookingCode: data.bookingCode, dueDate, issuerName: lead.assignedTo.fullName, issuerContact: internationalPhone(lead.assignedTo.phoneNumber), issuerEmail: lead.assignedTo.email, amountUsd: amount, depositPercent, depositDueDays, depositAmountUsd: deposit, depositDueDate, balanceAmountUsd: Math.round((amount - deposit) * 100) / 100, balanceDueDate: dueDate, ...templateData };
  const itemRows = items.map((item, displayOrder) => ({ description: item.description, quantity: item.quantity, unit: item.unit, amountUsd: Math.round(item.amountUsd * 100) / 100, pricePerPaxUsd: Math.round(item.amountUsd / item.quantity * 100) / 100, displayOrder }));
  const paymentRows = selectedPayments.map((payment, displayOrder) => ({ paymentOptionId: payment.id, name: payment.name, content: payment.content, displayOrder }));
  await prisma.$transaction(async (tx) => {
    let saved: { id: string };
    if (lead.invoice) {
      saved = await tx.leadInvoice.update({ where: { id: lead.invoice.id }, data: payload });
      await tx.leadInvoiceItem.deleteMany({ where: { invoiceId: saved.id } });
      await tx.leadInvoiceItem.createMany({ data: itemRows.map((item) => ({ invoiceId: saved.id, ...item })) });
      await tx.leadInvoicePaymentOption.deleteMany({ where: { invoiceId: saved.id } });
      if (paymentRows.length) await tx.leadInvoicePaymentOption.createMany({ data: paymentRows.map((item) => ({ invoiceId: saved.id, ...item })) });
    } else {
      saved = await tx.leadInvoice.create({ data: { leadId, ...payload, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, items: { create: itemRows }, paymentOptions: { create: paymentRows } } });
    }
    if (lead.estimate) {
      const savedVnd = new Map(lead.estimate.revenueItems.map((item) => [item.displayOrder, item.amountVnd]));
      await tx.invoiceEstimateRevenueItem.deleteMany({ where: { estimateId: lead.estimate.id } });
      await tx.invoiceEstimateRevenueItem.createMany({ data: itemRows.map((item) => ({ estimateId: lead.estimate!.id, settlementType: "Tour", category: item.description, unitPriceUsd: item.pricePerPaxUsd, quantity: item.quantity, amountUsd: item.amountUsd, amountVnd: savedVnd.get(item.displayOrder) ?? 0, displayOrder: item.displayOrder })) });
    }
    return saved;
  });
  redirect(`/leads/${leadId}/invoice`);
}

export async function saveB2BLeadInvoice(leadId: string, formData: FormData) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE"); const { readable } = await getLeadFieldAccess(actor);
  if (!["leadId", "customerName", "phone", "whatsapp", "email", "dateConfirmation", "destination", "numberOfPax", "quotationValueUsd", "assignedToId"].every((field) => readable.has(field))) throw new Error("Bạn không có quyền đọc đủ dữ liệu để tạo Invoice.");
  const lead = await prisma.b2BLead.findUnique({ where: { id: leadId }, select: { id: true, dateConfirmation: true, assignedTo: { select: { fullName: true, phoneNumber: true, email: true } }, invoice: { select: { id: true } }, estimate: { include: { revenueItems: { orderBy: { displayOrder: "asc" } } } } } }); if (!lead) throw new Error("Không tìm thấy Lead B2B."); if (!lead.assignedTo) throw new Error("Lead B2B chưa có Assigned To. Vui lòng phân công người phụ trách trước khi lưu Invoice.");
  const data = schema.parse({ invoiceNumber: formData.get("invoiceNumber"), billTo: formData.get("billTo"), contact: String(formData.get("contact") ?? ""), email: String(formData.get("email") ?? ""), bookingCode: formData.get("bookingCode"), dueDate: String(formData.get("dueDate") ?? ""), rowCount: formData.get("rowCount"), paymentOptionIds: [...new Set(formData.getAll("paymentOptionId").map(String))], headerTemplateId: String(formData.get("headerTemplateId") ?? ""), footerTemplateId: String(formData.get("footerTemplateId") ?? "") });
  const items = Array.from({ length: data.rowCount }, (_, index) => itemSchema.parse({ description: formData.get(`description_${index}`), quantity: formData.get(`quantity_${index}`), unit: formData.get(`unit_${index}`), amountUsd: formData.get(`amountUsd_${index}`) }));
  const payments = data.paymentOptionIds.length ? await prisma.invoicePaymentOption.findMany({ where: { id: { in: data.paymentOptionIds }, active: true } }) : []; if (payments.length !== data.paymentOptionIds.length) throw new Error("Payment Option không hợp lệ.");
  const paymentMap = new Map(payments.map((item) => [item.id, item])); const selectedPayments = data.paymentOptionIds.map((id) => paymentMap.get(id)!);
  const [templateData, setting] = await Promise.all([snapshots(data.headerTemplateId, data.footerTemplateId), prisma.invoiceSetting.findUnique({ where: { id: "default" } })]);
  const depositPercent = Number(setting?.depositPercent ?? 50); const depositDueDays = setting?.depositDueDays ?? 50; const amount = Math.round(items.reduce((sum, item) => sum + item.amountUsd, 0) * 100) / 100; const deposit = Math.round(amount * depositPercent) / 100;
  const dueDate = data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null; const depositDueDate = dueDate ? new Date(dueDate) : null; if (depositDueDate) depositDueDate.setUTCDate(depositDueDate.getUTCDate() - depositDueDays);
  const payload = { invoiceNumber: data.invoiceNumber, billTo: data.billTo, contact: data.contact, email: data.email, bookingCode: data.bookingCode, dueDate, issuerName: lead.assignedTo.fullName, issuerContact: internationalPhone(lead.assignedTo.phoneNumber), issuerEmail: lead.assignedTo.email, amountUsd: amount, depositPercent, depositDueDays, depositAmountUsd: deposit, depositDueDate, balanceAmountUsd: Math.round((amount - deposit) * 100) / 100, balanceDueDate: dueDate, ...templateData };
  const itemRows = items.map((item, displayOrder) => ({ description: item.description, quantity: item.quantity, unit: item.unit, amountUsd: Math.round(item.amountUsd * 100) / 100, pricePerPaxUsd: Math.round(item.amountUsd / item.quantity * 100) / 100, displayOrder }));
  const paymentRows = selectedPayments.map((payment, displayOrder) => ({ paymentOptionId: payment.id, name: payment.name, content: payment.content, displayOrder }));
  await prisma.$transaction(async (tx) => {
    let saved: { id: string };
    if (lead.invoice) {
      saved = await tx.leadInvoice.update({ where: { id: lead.invoice.id }, data: payload });
      await tx.leadInvoiceItem.deleteMany({ where: { invoiceId: saved.id } }); await tx.leadInvoiceItem.createMany({ data: itemRows.map((item) => ({ invoiceId: saved.id, ...item })) });
      await tx.leadInvoicePaymentOption.deleteMany({ where: { invoiceId: saved.id } }); if (paymentRows.length) await tx.leadInvoicePaymentOption.createMany({ data: paymentRows.map((item) => ({ invoiceId: saved.id, ...item })) });
    } else {
      saved = await tx.leadInvoice.create({ data: { b2bLeadId: leadId, ...payload, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, items: { create: itemRows }, paymentOptions: { create: paymentRows } } });
    }
    if (lead.estimate) {
      const savedVnd = new Map(lead.estimate.revenueItems.map((item) => [item.displayOrder, item.amountVnd]));
      await tx.invoiceEstimateRevenueItem.deleteMany({ where: { estimateId: lead.estimate.id } });
      await tx.invoiceEstimateRevenueItem.createMany({ data: itemRows.map((item) => ({ estimateId: lead.estimate!.id, settlementType: "Tour", category: item.description, unitPriceUsd: item.pricePerPaxUsd, quantity: item.quantity, amountUsd: item.amountUsd, amountVnd: savedVnd.get(item.displayOrder) ?? 0, displayOrder: item.displayOrder })) });
    }
    return saved;
  });
  redirect(`/b2b-leads/${leadId}/invoice`);
}
