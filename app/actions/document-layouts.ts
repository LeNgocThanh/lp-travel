"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { CURRENT_DOCUMENT_LAYOUT_VERSION } from "@/lib/document-layout";
import { requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";
import { workCaseScope } from "@/lib/work-case-access";

export async function regenerateQuickItineraryLayout(id: string) {
  const actor = await requireUser(); const item = await prisma.quickItinerary.findUnique({ where: { id }, select: { createdById: true, leadId: true, b2bLeadId: true, inclusions: true, exclusions: true, informationNotes: true } });
  if (!item) throw new Error("Không tìm thấy lịch trình.");
  if (item.leadId || item.b2bLeadId) await requireResourceAction(actor, "LEADS", "UPDATE"); else if (actor.role !== "ADMIN" && item.createdById !== actor.id) throw new Error("Bạn không có quyền cập nhật lịch trình này.");
  const information = await prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } });
  await prisma.quickItinerary.update({ where: { id }, data: { layoutVersion: CURRENT_DOCUMENT_LAYOUT_VERSION, ...(!item.inclusions ? { inclusions: information?.inclusions || null } : {}), ...(!item.exclusions ? { exclusions: information?.exclusions || null } : {}), ...(!item.informationNotes ? { informationNotes: information?.notes || null } : {}) } });
  revalidatePath(`/quick/${id}`); if (item.leadId) revalidatePath(`/leads/${item.leadId}`); if (item.b2bLeadId) revalidatePath(`/b2b-leads/${item.b2bLeadId}`);
}

export async function regenerateWorkCaseItineraryLayout(workCaseId: string) {
  const actor = await requireUser(); const workCase = await prisma.workCase.findFirst({ where: { id: workCaseId, ...(await workCaseScope(actor)) }, select: { itinerary: { select: { id: true, inclusions: true, exclusions: true, informationNotes: true } } } });
  if (!workCase?.itinerary) throw new Error("Hồ sơ chưa có lịch trình.");
  const information = await prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } });
  await prisma.workCaseItinerary.update({ where: { id: workCase.itinerary.id }, data: { layoutVersion: CURRENT_DOCUMENT_LAYOUT_VERSION, ...(!workCase.itinerary.inclusions ? { inclusions: information?.inclusions || null } : {}), ...(!workCase.itinerary.exclusions ? { exclusions: information?.exclusions || null } : {}), ...(!workCase.itinerary.informationNotes ? { informationNotes: information?.notes || null } : {}) } });
  revalidatePath(`/work/${workCaseId}/itinerary`);
}

export async function regenerateLeadInvoiceLayout(leadId: string) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE");
  const invoice = await prisma.leadInvoice.findUnique({ where: { leadId }, select: { id: true } }); if (!invoice) throw new Error("Lead chưa có Invoice.");
  await prisma.leadInvoice.update({ where: { id: invoice.id }, data: { layoutVersion: CURRENT_DOCUMENT_LAYOUT_VERSION } });
  revalidatePath(`/leads/${leadId}/invoice`);
}

export async function regenerateB2BLeadInvoiceLayout(leadId: string) {
  const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE");
  const invoice = await prisma.leadInvoice.findUnique({ where: { b2bLeadId: leadId }, select: { id: true } }); if (!invoice) throw new Error("Lead B2B chưa có Invoice.");
  await prisma.leadInvoice.update({ where: { id: invoice.id }, data: { layoutVersion: CURRENT_DOCUMENT_LAYOUT_VERSION } });
  revalidatePath(`/b2b-leads/${leadId}/invoice`);
}
