"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const groups = ["ACCOMMODATION", "TRANSPORTATION", "SERVICES", "TICKET_GUIDE", "INSURANCE"] as const;
const costSchema = z.object({ group: z.enum(groups), category: z.string().trim().min(1).max(500), unitPriceVnd: z.coerce.number().min(0).max(9999999999999999), quantity: z.coerce.number().min(0).max(9999999999), vatVnd: z.coerce.number().min(0).max(9999999999999999), note: z.string().trim().max(2000).transform((value) => value || null), url: z.union([z.url(), z.literal("")]).transform((value) => value || null) });
const costCountSchema = z.coerce.number().int().min(0).max(100);
const revenueCountSchema = z.coerce.number().int().min(1).max(100);
const moneySchema = z.coerce.number().min(0).max(9999999999999999);
const revenueSchema = z.object({ settlementType: z.string().trim().min(1).max(100), category: z.string().trim().min(1).max(2000), unitPriceUsd: z.coerce.number().min(0).max(999999999999), quantity: z.coerce.number().int().min(1).max(100000), amountVnd: moneySchema });
const optionalMoneySchema = z.union([z.literal(""), z.coerce.number().positive().max(9999999999999999)]).transform((value) => value === "" ? null : value);
const round = (value: number) => Math.round(value * 100) / 100;

export async function saveInvoiceEstimate(leadId: string, formData: FormData) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE");
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, estimate: { select: { id: true } }, invoice: { select: { id: true, depositPercent: true } } } });
  if (!lead) throw new Error("Không tìm thấy Lead.");
  const costCount = costCountSchema.parse(formData.get("costCount"));
  const revenueCount = revenueCountSchema.parse(formData.get("revenueCount"));
  const exchangeRateVnd = optionalMoneySchema.parse(String(formData.get("exchangeRateVnd") ?? ""));
  const costs = Array.from({ length: costCount }, (_, index) => costSchema.parse({ group: formData.get(`costGroup_${index}`), category: formData.get(`costCategory_${index}`), unitPriceVnd: formData.get(`costUnitPriceVnd_${index}`), quantity: formData.get(`costQuantity_${index}`), vatVnd: formData.get(`costVatVnd_${index}`), note: String(formData.get(`costNote_${index}`) ?? ""), url: String(formData.get(`costUrl_${index}`) ?? "") }));
  const revenues = Array.from({ length: revenueCount }, (_, index) => { const item = revenueSchema.parse({ settlementType: formData.get(`revenueSettlementType_${index}`), category: formData.get(`revenueCategory_${index}`), unitPriceUsd: formData.get(`revenueUnitPriceUsd_${index}`), quantity: formData.get(`revenueQuantity_${index}`), amountVnd: formData.get(`revenueAmountVnd_${index}`) }); return { ...item, unitPriceUsd: round(item.unitPriceUsd), amountUsd: round(item.unitPriceUsd * item.quantity), amountVnd: round(item.amountVnd), displayOrder: index }; });
  await prisma.$transaction(async (tx) => {
    const estimate = lead.estimate ? await tx.invoiceEstimate.update({ where: { id: lead.estimate.id }, data: { exchangeRateVnd } }) : await tx.invoiceEstimate.create({ data: { leadId: lead.id, exchangeRateVnd, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName } });
    await tx.invoiceEstimateCostItem.deleteMany({ where: { estimateId: estimate.id } });
    await tx.invoiceEstimateRevenueItem.deleteMany({ where: { estimateId: estimate.id } });
    if (costs.length) await tx.invoiceEstimateCostItem.createMany({ data: costs.map((item, displayOrder) => ({ estimateId: estimate.id, group: item.group, category: item.category, unitPriceVnd: round(item.unitPriceVnd), quantity: round(item.quantity), amountVnd: round(item.unitPriceVnd * item.quantity), vatVnd: round(item.vatVnd), note: item.note, url: item.url, displayOrder })) });
    if (revenues.length) await tx.invoiceEstimateRevenueItem.createMany({ data: revenues.map((item) => ({ estimateId: estimate.id, ...item })) });
    if (lead.invoice) {
      await tx.leadInvoiceItem.deleteMany({ where: { invoiceId: lead.invoice.id } });
      await tx.leadInvoiceItem.createMany({ data: revenues.map((item) => ({ invoiceId: lead.invoice!.id, description: item.category, quantity: item.quantity, unit: "Pax", pricePerPaxUsd: item.unitPriceUsd, amountUsd: item.amountUsd, displayOrder: item.displayOrder })) });
      const amountUsd = round(revenues.reduce((sum, item) => sum + item.amountUsd, 0)); const depositAmountUsd = round(amountUsd * Number(lead.invoice.depositPercent) / 100);
      await tx.leadInvoice.update({ where: { id: lead.invoice.id }, data: { amountUsd, depositAmountUsd, balanceAmountUsd: round(amountUsd - depositAmountUsd) } });
    }
  });
  revalidatePath(`/leads/${leadId}/invoice`);
  revalidatePath(`/leads/${leadId}/invoice/estimate`);
}

export async function saveB2BInvoiceEstimate(leadId: string, formData: FormData) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE");
  const lead = await prisma.b2BLead.findUnique({ where: { id: leadId }, select: { id: true, estimate: { select: { id: true } }, invoice: { select: { id: true, depositPercent: true } } } });
  if (!lead) throw new Error("Không tìm thấy Lead B2B.");
  const costCount = costCountSchema.parse(formData.get("costCount"));
  const revenueCount = revenueCountSchema.parse(formData.get("revenueCount"));
  const exchangeRateVnd = optionalMoneySchema.parse(String(formData.get("exchangeRateVnd") ?? ""));
  const costs = Array.from({ length: costCount }, (_, index) => costSchema.parse({ group: formData.get(`costGroup_${index}`), category: formData.get(`costCategory_${index}`), unitPriceVnd: formData.get(`costUnitPriceVnd_${index}`), quantity: formData.get(`costQuantity_${index}`), vatVnd: formData.get(`costVatVnd_${index}`), note: String(formData.get(`costNote_${index}`) ?? ""), url: String(formData.get(`costUrl_${index}`) ?? "") }));
  const revenues = Array.from({ length: revenueCount }, (_, index) => { const item = revenueSchema.parse({ settlementType: formData.get(`revenueSettlementType_${index}`), category: formData.get(`revenueCategory_${index}`), unitPriceUsd: formData.get(`revenueUnitPriceUsd_${index}`), quantity: formData.get(`revenueQuantity_${index}`), amountVnd: formData.get(`revenueAmountVnd_${index}`) }); return { ...item, unitPriceUsd: round(item.unitPriceUsd), amountUsd: round(item.unitPriceUsd * item.quantity), amountVnd: round(item.amountVnd), displayOrder: index }; });
  await prisma.$transaction(async (tx) => {
    const estimate = lead.estimate ? await tx.invoiceEstimate.update({ where: { id: lead.estimate.id }, data: { exchangeRateVnd } }) : await tx.invoiceEstimate.create({ data: { b2bLeadId: lead.id, exchangeRateVnd, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName } });
    await tx.invoiceEstimateCostItem.deleteMany({ where: { estimateId: estimate.id } });
    await tx.invoiceEstimateRevenueItem.deleteMany({ where: { estimateId: estimate.id } });
    if (costs.length) await tx.invoiceEstimateCostItem.createMany({ data: costs.map((item, displayOrder) => ({ estimateId: estimate.id, group: item.group, category: item.category, unitPriceVnd: round(item.unitPriceVnd), quantity: round(item.quantity), amountVnd: round(item.unitPriceVnd * item.quantity), vatVnd: round(item.vatVnd), note: item.note, url: item.url, displayOrder })) });
    if (revenues.length) await tx.invoiceEstimateRevenueItem.createMany({ data: revenues.map((item) => ({ estimateId: estimate.id, ...item })) });
    if (lead.invoice) {
      await tx.leadInvoiceItem.deleteMany({ where: { invoiceId: lead.invoice.id } });
      await tx.leadInvoiceItem.createMany({ data: revenues.map((item) => ({ invoiceId: lead.invoice!.id, description: item.category, quantity: item.quantity, unit: "Pax", pricePerPaxUsd: item.unitPriceUsd, amountUsd: item.amountUsd, displayOrder: item.displayOrder })) });
      const amountUsd = round(revenues.reduce((sum, item) => sum + item.amountUsd, 0)); const depositAmountUsd = round(amountUsd * Number(lead.invoice.depositPercent) / 100);
      await tx.leadInvoice.update({ where: { id: lead.invoice.id }, data: { amountUsd, depositAmountUsd, balanceAmountUsd: round(amountUsd - depositAmountUsd) } });
    }
  });
  revalidatePath(`/b2b-leads/${leadId}/invoice`);
  revalidatePath(`/b2b-leads/${leadId}/invoice/estimate`);
}
