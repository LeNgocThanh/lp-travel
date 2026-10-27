"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeadFieldAccess, requireResourceAction } from "@/lib/lead-access";

export type QuickItineraryState = { error?: string } | undefined;

const mainSchema = z.object({ title: z.string().trim().min(2).max(150), rowCount: z.coerce.number().int().min(1).max(100) });
const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const rowSchema = z.object({
  date: z.string().date(),
  title: z.string().trim().min(2).max(200),
  transport: optional(200),
  flight: optional(500),
  startLocation: optional(200),
  endLocation: optional(200),
  activityLocation: optional(500),
  accommodation: optional(200),
  overnightLocation: optional(200),
  description: optional(20000),
  notes: optional(5000),
  guidePickupNote: optional(1000),
  guideDropoffNote: optional(1000),
});

async function templateSnapshots(formData: FormData) {
  const headerTemplateId = String(formData.get("headerTemplateId") ?? "") || null;
  const footerTemplateId = String(formData.get("footerTemplateId") ?? "") || null;
  const [header, footer] = await Promise.all([
    headerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: headerTemplateId, type: "HEADER", active: true } }) : null,
    footerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: footerTemplateId, type: "FOOTER", active: true } }) : null,
  ]);
  if (headerTemplateId && !header) throw new Error("Mẫu Header không hợp lệ hoặc đã được lưu trữ.");
  if (footerTemplateId && !footer) throw new Error("Mẫu Footer không hợp lệ hoặc đã được lưu trữ.");
  return {
    headerTemplateId: header?.id ?? null, headerContent: header?.content ?? null, headerMetadata: (header?.metadata ?? {}) as Prisma.InputJsonValue,
    headerImageFolderId: header?.imageFolderId ?? null, headerImageStoredName: header?.imageStoredName ?? null, headerImageMimeType: header?.imageMimeType ?? null, headerImageAlt: header?.imageAlt ?? null,
    footerTemplateId: footer?.id ?? null, footerContent: footer?.content ?? null, footerMetadata: (footer?.metadata ?? {}) as Prisma.InputJsonValue,
    footerImageFolderId: footer?.imageFolderId ?? null, footerImageStoredName: footer?.imageStoredName ?? null, footerImageMimeType: footer?.imageMimeType ?? null, footerImageAlt: footer?.imageAlt ?? null,
  };
}

async function parseDays(formData: FormData, rowCount: number) {
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const row = rowSchema.parse({
      date: formData.get(`date_${index}`), title: formData.get(`dayTitle_${index}`), transport: String(formData.get(`transport_${index}`) ?? ""), flight: String(formData.get(`flight_${index}`) ?? ""),
      startLocation: String(formData.get(`startLocation_${index}`) ?? ""), endLocation: String(formData.get(`endLocation_${index}`) ?? ""),
      activityLocation: String(formData.get(`activityLocation_${index}`) ?? ""), accommodation: String(formData.get(`accommodation_${index}`) ?? ""),
      overnightLocation: String(formData.get(`overnightLocation_${index}`) ?? ""), description: String(formData.get(`description_${index}`) ?? ""), notes: String(formData.get(`notes_${index}`) ?? ""), guidePickupNote: String(formData.get(`guidePickupNote_${index}`) ?? ""), guideDropoffNote: String(formData.get(`guideDropoffNote_${index}`) ?? ""),
    });
    const overnight = formData.has(`overnight_${index}`);
    if (overnight && !row.overnightLocation) throw new Error(`Vui lòng nhập địa điểm nghỉ đêm ở ngày ${index + 1}.`);
    const tourGuide = formData.has(`tourGuide_${index}`); const tourGuideId = tourGuide ? String(formData.get(`tourGuideId_${index}`) ?? "") || null : null;
    const transports = (row.transport ?? "").split(",").map((item) => item.trim()).filter(Boolean).filter((item) => item.toUpperCase() !== "ESG");
    const guidePickup = tourGuide && formData.has(`guidePickup_${index}`); const guideDropoff = tourGuide && formData.has(`guideDropoff_${index}`);
    return { ...row, guidePickup, guidePickupNote: guidePickup ? row.guidePickupNote : null, guideDropoff, guideDropoffNote: guideDropoff ? row.guideDropoffNote : null, transport: [...transports, ...(tourGuide ? ["ESG"] : [])].join(", ") || null, dayNumber: index + 1, date: new Date(`${String(formData.get(`date_${index}`))}T00:00:00.000Z`), tourGuide, tourGuideId, overnight, breakfast: formData.has(`breakfast_${index}`), lunch: formData.has(`lunch_${index}`), dinner: formData.has(`dinner_${index}`) };
  });
  const ids = [...new Set(rows.flatMap((row) => row.tourGuideId ? [row.tourGuideId] : []))];
  const guides = ids.length ? await prisma.tourGuide.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, identityNumber: true } }) : [];
  const guideMap = new Map(guides.map((guide) => [guide.id, guide]));
  return rows.map((row, index) => { const guide = row.tourGuideId ? guideMap.get(row.tourGuideId) : null; if (row.tourGuideId && !guide) throw new Error(`Hướng dẫn viên ở ngày ${index + 1} không hợp lệ.`); return { ...row, tourGuideName: guide?.fullName ?? null, tourGuideIdentity: guide?.identityNumber ?? null, ...(guide ? { tourGuides: { create: [{ tourGuideId: guide.id, tourGuideName: guide.fullName, tourGuideIdentity: guide.identityNumber, role: "PRIMARY", displayOrder: 0 }] } } : {}) }; });
}

export async function createQuickItinerary(_: QuickItineraryState, formData: FormData): Promise<QuickItineraryState> {
  let id: string;
  try {
    const actor = await requireUser();
    const main = mainSchema.parse({ title: formData.get("title"), rowCount: formData.get("rowCount") });
    const [templates, days] = await Promise.all([templateSnapshots(formData), Promise.resolve(parseDays(formData, main.rowCount))]);
    const item = await prisma.quickItinerary.create({ data: { title: main.title, ...templates, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, days: { create: days } } });
    id = item.id;
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin các ngày." };
    return { error: error instanceof Error ? error.message : "Không thể lưu itinerary." };
  }
  redirect(`/quick/${id}`);
}

export async function createLeadItinerary(leadId: string, _: QuickItineraryState, formData: FormData): Promise<QuickItineraryState> {
  let id: string; let existing = false;
  try {
    const actor = await requireUser();
    await requireResourceAction(actor, "LEADS", "UPDATE");
    const { readable } = await getLeadFieldAccess(actor);
    if (!["duration", "travelDate", "destination"].every((field) => readable.has(field))) throw new Error("Bạn không có quyền đọc đủ Duration, Travel Date và Destination của Lead.");
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, quickItinerary: { select: { id: true, documentEnabled: true } } } });
    if (!lead) throw new Error("Không tìm thấy Lead.");
    if (lead.quickItinerary?.documentEnabled) { id = lead.quickItinerary.id; existing = true; }
    else {
      const main = mainSchema.parse({ title: formData.get("title"), rowCount: formData.get("rowCount") });
      const [templates, days, information] = await Promise.all([templateSnapshots(formData), Promise.resolve(parseDays(formData, main.rowCount)), prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } })]);
      if (lead.quickItinerary) {
        id = lead.quickItinerary.id;
        await prisma.$transaction(async (tx) => {
          await tx.quickItineraryDay.deleteMany({ where: { itineraryId: id } });
          await tx.quickItinerary.update({ where: { id }, data: { documentEnabled: true, title: main.title, ...templates, days: { create: days } } });
        });
      } else {
        const item = await prisma.quickItinerary.create({ data: { leadId: lead.id, title: main.title, ...templates, inclusions: information?.inclusions || null, exclusions: information?.exclusions || null, informationNotes: information?.notes || null, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, days: { create: days } } });
        id = item.id;
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin các ngày." };
    return { error: error instanceof Error ? error.message : "Không thể lưu itinerary cho Lead." };
  }
  redirect(`/quick/${id}${existing ? "?edit=1" : ""}`);
}

export async function createB2BLeadItinerary(leadId: string, _: QuickItineraryState, formData: FormData): Promise<QuickItineraryState> {
  let id: string; let existing = false;
  try {
    const actor = await requireUser();
    await requireResourceAction(actor, "LEADS", "UPDATE");
    const { readable } = await getLeadFieldAccess(actor);
    if (!["duration", "travelDate", "destination"].every((field) => readable.has(field))) throw new Error("Bạn không có quyền đọc đủ Duration, Travel Date và Destination của Lead B2B.");
    const lead = await prisma.b2BLead.findUnique({ where: { id: leadId }, select: { id: true, quickItinerary: { select: { id: true, documentEnabled: true } } } });
    if (!lead) throw new Error("Không tìm thấy Lead B2B.");
    if (lead.quickItinerary?.documentEnabled) { id = lead.quickItinerary.id; existing = true; }
    else {
      const main = mainSchema.parse({ title: formData.get("title"), rowCount: formData.get("rowCount") });
      const [templates, days, information] = await Promise.all([templateSnapshots(formData), Promise.resolve(parseDays(formData, main.rowCount)), prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } })]);
      if (lead.quickItinerary) {
        id = lead.quickItinerary.id;
        await prisma.$transaction(async (tx) => {
          await tx.quickItineraryDay.deleteMany({ where: { itineraryId: id } });
          await tx.quickItinerary.update({ where: { id }, data: { documentEnabled: true, title: main.title, ...templates, days: { create: days } } });
        });
      } else {
        const item = await prisma.quickItinerary.create({ data: { b2bLeadId: lead.id, title: main.title, ...templates, inclusions: information?.inclusions || null, exclusions: information?.exclusions || null, informationNotes: information?.notes || null, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, days: { create: days } } });
        id = item.id;
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin các ngày." };
    return { error: error instanceof Error ? error.message : "Không thể lưu itinerary cho Lead B2B." };
  }
  redirect(`/quick/${id}${existing ? "?edit=1" : ""}`);
}

export async function updateQuickItinerary(id: string, _: QuickItineraryState, formData: FormData): Promise<QuickItineraryState> {
  try {
    const actor = await requireUser();
    const current = await prisma.quickItinerary.findUnique({ where: { id } });
    if (!current) throw new Error("Không tìm thấy itinerary hoặc bạn không có quyền.");
    if (current.leadId || current.b2bLeadId) await requireResourceAction(actor, "LEADS", "UPDATE");
    else if (actor.role !== "ADMIN" && current.createdById !== actor.id) throw new Error("Không tìm thấy itinerary hoặc bạn không có quyền.");
    const main = mainSchema.parse({ title: formData.get("title"), rowCount: formData.get("rowCount") });
    const [templates, days] = await Promise.all([templateSnapshots(formData), Promise.resolve(parseDays(formData, main.rowCount))]);
    await prisma.$transaction(async (tx) => {
      await tx.quickItineraryDay.deleteMany({ where: { itineraryId: id } });
      await tx.quickItinerary.update({ where: { id }, data: { documentEnabled: true, title: main.title, ...templates, days: { create: days } } });
    });
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin các ngày." };
    return { error: error instanceof Error ? error.message : "Không thể lưu itinerary." };
  }
  redirect(`/quick/${id}`);
}
