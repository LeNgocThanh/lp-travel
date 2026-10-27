"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

export type TourOperationOrderState = { error?: string } | undefined;
const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const schema = z.object({ companyName: z.string().trim().min(2).max(200), companyAddress: z.string().trim().min(2).max(1000), companyPhone: optional(50), companyTaxCode: z.string().trim().min(1).max(50), tourCode: z.string().trim().min(1).max(100), guestCount: z.string().trim().min(1).max(100), startDate: z.string().date(), endDate: z.string().date(), tourName: z.string().trim().min(2).max(1000), tourGuideNames: optional(2000), operatorName: optional(200), operatorTitle: optional(150), decisionText: z.string().trim().min(2).max(2000) });

async function sourceData(itineraryId: string) {
  const itinerary = await prisma.quickItinerary.findUnique({ where: { id: itineraryId }, include: {
    lead: { select: { leadId: true, numberOfPax: true, adults: true, children: true, assignedTo: { select: { fullName: true } } } },
    b2bLead: { select: { leadId: true, numberOfPax: true, adults: true, children: true, assignedTo: { select: { fullName: true } } } },
    days: { orderBy: { dayNumber: "asc" }, include: { selectedTourGuide: { select: { id: true, fullName: true } }, tourGuides: { orderBy: { displayOrder: "asc" }, select: { tourGuideId: true, tourGuideName: true, tourGuideIdentity: true } } } },
  } });
  if (!itinerary) throw new Error("Không tìm thấy lịch trình nguồn.");
  const setting = await prisma.tourGuideContractSetting.findUnique({ where: { id: "default" } });
  if (!setting) throw new Error("Chưa có cấu hình hợp đồng hướng dẫn viên.");
  if (!itinerary.days.length) throw new Error("Lịch trình chưa có ngày nào.");
  const lead = itinerary.lead ?? itinerary.b2bLead;
  if (!lead) throw new Error("Lệnh điều Tour chỉ được tạo từ lịch trình của Lead.");
  const guideMap = new Map<string, string>();
  itinerary.days.forEach((day) => {
    if (day.tourGuides.length) day.tourGuides.forEach((guide) => { const key = guide.tourGuideId ? `id:${guide.tourGuideId}` : `manual:${guide.tourGuideName.trim().toLocaleLowerCase("vi-VN")}|${guide.tourGuideIdentity.trim().toLocaleLowerCase("vi-VN")}`; if (!guideMap.has(key)) guideMap.set(key, guide.tourGuideName); });
    else if (day.tourGuide && (day.tourGuideName || day.selectedTourGuide)) { const name = day.tourGuideName || day.selectedTourGuide!.fullName; const key = day.tourGuideId ? `id:${day.tourGuideId}` : `manual:${name.trim().toLocaleLowerCase("vi-VN")}|${(day.tourGuideIdentity ?? "").trim().toLocaleLowerCase("vi-VN")}`; if (!guideMap.has(key)) guideMap.set(key, name); }
  });
  const guestCount = lead.numberOfPax ?? ((lead.adults ?? 0) + (lead.children ?? 0));
  const tourNames = [...new Set(itinerary.days.map((day) => day.title.trim()).filter(Boolean))];
  return { itinerary, values: { companyName: setting.companyName, companyAddress: setting.address, companyPhone: setting.phone, companyTaxCode: setting.taxCode, tourCode: lead.leadId, guestCount: String(guestCount), startDate: itinerary.days[0].date, endDate: itinerary.days[itinerary.days.length - 1].date, tourName: tourNames.join(" - "), tourGuideNames: [...guideMap.values()].join("\n") || null, operatorName: lead.assignedTo?.fullName ?? null, operatorTitle: "Điều hành", decisionText: "Quyết định triển khai tour du lịch như thông tin dưới đây:" } };
}

async function requireAccess(itineraryId: string) {
  const actor = await requireUser(); const source = await sourceData(itineraryId);
  if (source.itinerary.leadId || source.itinerary.b2bLeadId) await requireResourceAction(actor, "LEADS", "UPDATE");
  else if (actor.role !== "ADMIN" && source.itinerary.createdById !== actor.id) throw new Error("Bạn không có quyền tạo lệnh điều Tour từ lịch trình này.");
  return { actor, source };
}

export async function getTourOperationOrderInitial(itineraryId: string) {
  const { source } = await requireAccess(itineraryId); const value = source.values;
  return { companyName: value.companyName, companyAddress: value.companyAddress, companyPhone: value.companyPhone ?? "", companyTaxCode: value.companyTaxCode, tourCode: value.tourCode, guestCount: value.guestCount, startDate: value.startDate.toISOString().slice(0, 10), endDate: value.endDate.toISOString().slice(0, 10), tourName: value.tourName, tourGuideNames: value.tourGuideNames ?? "", operatorName: value.operatorName ?? "", operatorTitle: value.operatorTitle ?? "", decisionText: value.decisionText };
}

export async function saveTourOperationOrder(itineraryId: string, _: TourOperationOrderState, formData: FormData): Promise<TourOperationOrderState> {
  try {
    const { actor } = await requireAccess(itineraryId);
    const data = schema.parse(Object.fromEntries([...schema.keyof().options].map((key) => [key, String(formData.get(key) ?? "")])));
    if (data.startDate > data.endDate) throw new Error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
    const values = { ...data, startDate: new Date(`${data.startDate}T00:00:00.000Z`), endDate: new Date(`${data.endDate}T00:00:00.000Z`), updatedByType: actor.root ? "ROOT" : "USER", updatedById: actor.id, updatedByName: actor.fullName };
    await prisma.tourOperationOrder.upsert({ where: { itineraryId }, create: { itineraryId, ...values, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName }, update: values });
  } catch (error) { if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin lệnh điều Tour." }; return { error: error instanceof Error ? error.message : "Không thể lưu lệnh điều Tour." }; }
  redirect(`/quick/${itineraryId}/tour-operation-order`);
}

export async function regenerateTourOperationOrder(itineraryId: string) {
  const { actor, source } = await requireAccess(itineraryId);
  const current = await prisma.tourOperationOrder.findUnique({ where: { itineraryId }, select: { id: true } });
  if (!current) throw new Error("Chưa có lệnh điều Tour để gen lại.");
  await prisma.tourOperationOrder.update({ where: { itineraryId }, data: { ...source.values, updatedByType: actor.root ? "ROOT" : "USER", updatedById: actor.id, updatedByName: actor.fullName } });
  redirect(`/quick/${itineraryId}/tour-operation-order?edit=1`);
}
