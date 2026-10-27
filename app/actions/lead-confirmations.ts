"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

export type LeadConfirmationState = { error?: string } | undefined;

const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const mainSchema = z.object({ numberOfGuests: optional(100), numberOfRooms: optional(100), nationality: optional(200), guide: optional(500), notes: optional(5000) });
const confirmationRowSchema = z.object({ itinerary: optional(3000), meals: optional(2000), transferGuide: optional(2000), hotelInformation: optional(3000) });
const itineraryRowSchema = z.object({ title: z.string().trim().min(2).max(200), transport: optional(200), flight: optional(500), startLocation: optional(200), endLocation: optional(200), activityLocation: optional(500), accommodation: optional(200), description: optional(20000), notes: optional(5000) });

function durationDays(value: string | null) { const match = value?.trim().match(/\d+/); return Math.min(100, Math.max(1, match ? Number.parseInt(match[0], 10) : 1)); }
function addDays(value: Date, offset: number) { const result = new Date(value); result.setUTCDate(result.getUTCDate() + offset); return result; }

async function templateSnapshots(formData: FormData) {
  const headerTemplateId = String(formData.get("headerTemplateId") ?? "") || null; const footerTemplateId = String(formData.get("footerTemplateId") ?? "") || null;
  const [header, footer] = await Promise.all([headerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: headerTemplateId, type: "HEADER", active: true } }) : null, footerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: footerTemplateId, type: "FOOTER", active: true } }) : null]);
  if (headerTemplateId && !header) throw new Error("Mẫu Header không hợp lệ hoặc đã được lưu trữ.");
  if (footerTemplateId && !footer) throw new Error("Mẫu Footer không hợp lệ hoặc đã được lưu trữ.");
  return { headerTemplateId: header?.id ?? null, headerContent: header?.content ?? null, headerMetadata: (header?.metadata ?? {}) as Prisma.InputJsonValue, headerImageFolderId: header?.imageFolderId ?? null, headerImageStoredName: header?.imageStoredName ?? null, headerImageMimeType: header?.imageMimeType ?? null, headerImageAlt: header?.imageAlt ?? null, footerTemplateId: footer?.id ?? null, footerContent: footer?.content ?? null, footerMetadata: (footer?.metadata ?? {}) as Prisma.InputJsonValue, footerImageFolderId: footer?.imageFolderId ?? null, footerImageStoredName: footer?.imageStoredName ?? null, footerImageMimeType: footer?.imageMimeType ?? null, footerImageAlt: footer?.imageAlt ?? null };
}

export async function saveLeadConfirmation(leadId: string, _: LeadConfirmationState, formData: FormData): Promise<LeadConfirmationState> {
  try {
    const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE");
    const { readable } = await getLeadFieldAccess(actor); if (!["leadId", "duration", "travelDate", "destination"].every((field) => readable.has(field))) throw new Error("Bạn không có quyền đọc đủ Lead ID, Duration, Travel Date và Destination của Lead.");
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, duration: true, travelDate: true, destination: true, quickItinerary: { select: { id: true, title: true } }, confirmation: { select: { id: true } } } });
    if (!lead) throw new Error("Không tìm thấy Lead."); if (!lead.travelDate) throw new Error("Lead chưa có Travel Date.");
    const data = mainSchema.parse(Object.fromEntries(formData)); const count = durationDays(lead.duration); const templates = await templateSnapshots(formData);
    const confirmationDays = Array.from({ length: count }, (_, index) => ({ ...confirmationRowSchema.parse({ itinerary: String(formData.get(`itinerary_${index}`) ?? ""), meals: String(formData.get(`meals_${index}`) ?? ""), transferGuide: String(formData.get(`transferGuide_${index}`) ?? ""), hotelInformation: String(formData.get(`hotelInformation_${index}`) ?? "") }), dayNumber: index + 1, date: addDays(lead.travelDate!, index) }));
    const itineraryDays = Array.from({ length: count }, (_, index) => { const row = itineraryRowSchema.parse({ title: formData.get(`dayTitle_${index}`), transport: String(formData.get(`transport_${index}`) ?? ""), flight: String(formData.get(`flight_${index}`) ?? ""), startLocation: String(formData.get(`startLocation_${index}`) ?? ""), endLocation: String(formData.get(`endLocation_${index}`) ?? ""), activityLocation: String(formData.get(`activityLocation_${index}`) ?? ""), accommodation: String(formData.get(`accommodation_${index}`) ?? ""), description: String(formData.get(`description_${index}`) ?? ""), notes: String(formData.get(`dayNotes_${index}`) ?? "") }); return { ...row, dayNumber: index + 1, date: addDays(lead.travelDate!, index), tourGuide: formData.has(`tourGuide_${index}`), overnight: Boolean(row.accommodation), overnightLocation: row.accommodation, breakfast: formData.has(`breakfast_${index}`), lunch: formData.has(`lunch_${index}`), dinner: formData.has(`dinner_${index}`) }; });
    const information = lead.quickItinerary ? null : await prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } });
    await prisma.$transaction(async (tx) => {
      if (lead.quickItinerary) { const itineraryId = lead.quickItinerary.id; await tx.quickItineraryDay.deleteMany({ where: { itineraryId } }); await tx.quickItinerary.update({ where: { id: itineraryId }, data: { ...templates, days: { create: itineraryDays } } }); }
      else await tx.quickItinerary.create({ data: { leadId: lead.id, documentEnabled: false, title: `ITINERARY - ${lead.destination?.trim() || "Destination"}`, ...templates, inclusions: information?.inclusions || null, exclusions: information?.exclusions || null, informationNotes: information?.notes || null, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, days: { create: itineraryDays } } });
      const confirmationData = { numberOfGuests: data.numberOfGuests, numberOfRooms: data.numberOfRooms, nationality: data.nationality, guide: data.guide, notes: data.notes };
      const confirmation = lead.confirmation ? await tx.leadConfirmation.update({ where: { id: lead.confirmation.id }, data: confirmationData }) : await tx.leadConfirmation.create({ data: { leadId: lead.id, ...confirmationData, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName } });
      await tx.leadConfirmationDay.deleteMany({ where: { confirmationId: confirmation.id } }); await tx.leadConfirmationDay.createMany({ data: confirmationDays.map((day) => ({ confirmationId: confirmation.id, ...day })) });
    });
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map((issue) => issue.message).join("; ") };
    return { error: error instanceof Error ? error.message : "Không thể lưu Confirmation." };
  }
  redirect(`/leads/${leadId}/confirmation`);
}

export async function saveB2BLeadConfirmation(leadId: string, _: LeadConfirmationState, formData: FormData): Promise<LeadConfirmationState> {
  try {
    const actor = await requireUser(); await requireResourceAction(actor, "LEADS", "UPDATE");
    const { readable } = await getLeadFieldAccess(actor); if (!["leadId", "duration", "travelDate", "destination"].every((field) => readable.has(field))) throw new Error("Bạn không có quyền đọc đủ Lead ID, Duration, Travel Date và Destination của Lead B2B.");
    const lead = await prisma.b2BLead.findUnique({ where: { id: leadId }, select: { id: true, duration: true, travelDate: true, destination: true, quickItinerary: { select: { id: true, title: true } }, confirmation: { select: { id: true } } } });
    if (!lead) throw new Error("Không tìm thấy Lead B2B."); if (!lead.travelDate) throw new Error("Lead B2B chưa có Travel Date.");
    const data = mainSchema.parse(Object.fromEntries(formData)); const count = durationDays(lead.duration); const templates = await templateSnapshots(formData);
    const confirmationDays = Array.from({ length: count }, (_, index) => ({ ...confirmationRowSchema.parse({ itinerary: String(formData.get(`itinerary_${index}`) ?? ""), meals: String(formData.get(`meals_${index}`) ?? ""), transferGuide: String(formData.get(`transferGuide_${index}`) ?? ""), hotelInformation: String(formData.get(`hotelInformation_${index}`) ?? "") }), dayNumber: index + 1, date: addDays(lead.travelDate!, index) }));
    const itineraryDays = Array.from({ length: count }, (_, index) => { const row = itineraryRowSchema.parse({ title: formData.get(`dayTitle_${index}`), transport: String(formData.get(`transport_${index}`) ?? ""), flight: String(formData.get(`flight_${index}`) ?? ""), startLocation: String(formData.get(`startLocation_${index}`) ?? ""), endLocation: String(formData.get(`endLocation_${index}`) ?? ""), activityLocation: String(formData.get(`activityLocation_${index}`) ?? ""), accommodation: String(formData.get(`accommodation_${index}`) ?? ""), description: String(formData.get(`description_${index}`) ?? ""), notes: String(formData.get(`dayNotes_${index}`) ?? "") }); return { ...row, dayNumber: index + 1, date: addDays(lead.travelDate!, index), tourGuide: formData.has(`tourGuide_${index}`), overnight: Boolean(row.accommodation), overnightLocation: row.accommodation, breakfast: formData.has(`breakfast_${index}`), lunch: formData.has(`lunch_${index}`), dinner: formData.has(`dinner_${index}`) }; });
    const information = lead.quickItinerary ? null : await prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } });
    await prisma.$transaction(async (tx) => {
      if (lead.quickItinerary) { const itineraryId = lead.quickItinerary.id; await tx.quickItineraryDay.deleteMany({ where: { itineraryId } }); await tx.quickItinerary.update({ where: { id: itineraryId }, data: { ...templates, days: { create: itineraryDays } } }); }
      else await tx.quickItinerary.create({ data: { b2bLeadId: lead.id, documentEnabled: false, title: `ITINERARY - ${lead.destination?.trim() || "Destination"}`, ...templates, inclusions: information?.inclusions || null, exclusions: information?.exclusions || null, informationNotes: information?.notes || null, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, days: { create: itineraryDays } } });
      const confirmationData = { numberOfGuests: data.numberOfGuests, numberOfRooms: data.numberOfRooms, nationality: data.nationality, guide: data.guide, notes: data.notes };
      const confirmation = lead.confirmation ? await tx.leadConfirmation.update({ where: { id: lead.confirmation.id }, data: confirmationData }) : await tx.leadConfirmation.create({ data: { b2bLeadId: lead.id, ...confirmationData, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName } });
      await tx.leadConfirmationDay.deleteMany({ where: { confirmationId: confirmation.id } }); await tx.leadConfirmationDay.createMany({ data: confirmationDays.map((day) => ({ confirmationId: confirmation.id, ...day })) });
    });
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map((issue) => issue.message).join("; ") };
    return { error: error instanceof Error ? error.message : "Không thể lưu Confirmation cho Lead B2B." };
  }
  redirect(`/b2b-leads/${leadId}/confirmation`);
}
