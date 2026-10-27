"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

export type QuickTourProgramState = { error?: string } | undefined;
const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const schema = z.object({ title: z.string().trim().min(2).max(300), programName: z.string().trim().min(2).max(300), durationText: optional(100), transportText: optional(200), departureText: optional(300), tourCode: optional(100), guestSummary: optional(500), startDate: optional(10), endDate: optional(10), groupLeaderName: optional(150), groupLeaderPhone: optional(50), vehiclePlate: optional(50), driverName: optional(150), driverPhone: optional(50), tourGuideName: optional(150), tourGuidePhone: optional(50), closingText: optional(2000), rowCount: z.coerce.number().int().min(1).max(100), guideCount: z.coerce.number().int().min(0).max(100), inclusionCount: z.coerce.number().int().min(0).max(200), exclusionCount: z.coerce.number().int().min(0).max(200) });
const dateOrNull = (value: string | null) => value ? new Date(`${value}T00:00:00.000Z`) : null;

async function sourceSnapshot(itineraryId: string) {
  const itinerary = await prisma.quickItinerary.findUnique({ where: { id: itineraryId }, include: { lead: { select: { leadId: true, adults: true, children: true, destination: true, duration: true } }, b2bLead: { select: { leadId: true, adults: true, children: true, destination: true, duration: true } }, days: { orderBy: { dayNumber: "asc" }, include: { selectedTourGuide: { select: { id: true, fullName: true, identityNumber: true, phone: true } }, tourGuides: { orderBy: { displayOrder: "asc" }, include: { tourGuide: { select: { id: true, fullName: true, identityNumber: true, phone: true } } } } } } } });
  if (!itinerary) throw new Error("Không tìm thấy lịch trình nguồn.");
  const lead = itinerary.lead ?? itinerary.b2bLead;
  const firstDay = itinerary.days[0]; const lastDay = itinerary.days.at(-1);
  const guideMap = new Map<string, { tourGuideId: string | null; name: string; phone: string | null }>();
  itinerary.days.forEach((day) => {
    const entries = day.tourGuides.length ? day.tourGuides.map((entry) => ({ tourGuideId: entry.tourGuideId, name: entry.tourGuideName || entry.tourGuide?.fullName || "", identity: entry.tourGuideIdentity || entry.tourGuide?.identityNumber || "", phone: entry.tourGuide?.phone ?? null })) : day.tourGuide && (day.tourGuideName || day.selectedTourGuide) ? [{ tourGuideId: day.tourGuideId, name: day.tourGuideName || day.selectedTourGuide?.fullName || "", identity: day.tourGuideIdentity || day.selectedTourGuide?.identityNumber || "", phone: day.selectedTourGuide?.phone ?? null }] : [];
    entries.forEach((guide) => { if (!guide.name) return; const key = guide.tourGuideId ? `id:${guide.tourGuideId}` : `manual:${guide.name.trim().toLocaleLowerCase("vi-VN")}|${guide.identity.trim().toLocaleLowerCase("vi-VN")}`; if (!guideMap.has(key)) guideMap.set(key, { tourGuideId: guide.tourGuideId, name: guide.name, phone: guide.phone }); });
  });
  const guides = [...guideMap.values()].map((guide, displayOrder) => ({ ...guide, displayOrder }));
  const firstGuide = guides[0];
  const transportText = [...new Set(itinerary.days.flatMap((day) => (day.transport ?? "").split(",").map((value) => value.trim()).filter((value) => value && value.toUpperCase() !== "ESG")))].join(", ") || null;
  const destination = lead?.destination?.trim() || itinerary.title.replace(/^ITINERARY\s*-?\s*/i, "").trim() || itinerary.title;
  const guestSummary = lead && (lead.adults !== null || lead.children !== null) ? `${lead.adults ?? 0} người lớn + ${String(lead.children ?? 0).padStart(2, "0")} trẻ em` : null;
  const lines = (value: string | null) => value?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  return {
    itinerary,
    data: { title: `CHƯƠNG TRÌNH TOUR - ${destination}`, durationText: lead?.duration || `${itinerary.days.length} ngày`, transportText, departureText: firstDay ? `Ngày ${firstDay.date.toLocaleDateString("vi-VN", { timeZone: "UTC" })}` : null, programName: destination, tourCode: lead?.leadId ?? null, guestSummary, startDate: firstDay?.date ?? null, endDate: lastDay?.date ?? null, tourGuideName: firstGuide?.name ?? null, tourGuidePhone: firstGuide?.phone ?? null },
    guides,
    days: itinerary.days.map((day, index) => ({ dayLabel: `Ngày ${index + 1}`, date: day.date, title: day.title, breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner, content: day.description, accommodation: day.accommodation || day.overnightLocation, notes: day.notes, displayOrder: index })),
    items: [...lines(itinerary.inclusions).map((content, displayOrder) => ({ type: "INCLUSION", content, displayOrder })), ...lines(itinerary.exclusions).map((content, displayOrder) => ({ type: "EXCLUSION", content, displayOrder }))],
    templates: { headerTemplateId: itinerary.headerTemplateId, headerContent: itinerary.headerContent, headerImageFolderId: itinerary.headerImageFolderId, headerImageStoredName: itinerary.headerImageStoredName, headerImageMimeType: itinerary.headerImageMimeType, headerImageAlt: itinerary.headerImageAlt, footerTemplateId: itinerary.footerTemplateId, footerContent: itinerary.footerContent, footerImageFolderId: itinerary.footerImageFolderId, footerImageStoredName: itinerary.footerImageStoredName, footerImageMimeType: itinerary.footerImageMimeType, footerImageAlt: itinerary.footerImageAlt },
  };
}

async function requireSourceAccess(actor: Awaited<ReturnType<typeof requireUser>>, itineraryId: string) {
  const source = await sourceSnapshot(itineraryId);
  if (source.itinerary.leadId || source.itinerary.b2bLeadId) await requireResourceAction(actor, "LEADS", "UPDATE");
  else if (actor.role !== "ADMIN" && source.itinerary.createdById !== actor.id) throw new Error("Bạn không có quyền sử dụng lịch trình này.");
  return source;
}

export async function getQuickTourProgramSourceInitial(itineraryId: string) {
  const actor = await requireUser(); const source = await requireSourceAccess(actor, itineraryId);
  return { sourceItineraryId: itineraryId, title: source.data.title, durationText: source.data.durationText ?? "", transportText: source.data.transportText ?? "", departureText: source.data.departureText ?? "", programName: source.data.programName, tourCode: source.data.tourCode ?? "", guestSummary: source.data.guestSummary ?? "", startDate: source.data.startDate?.toISOString().slice(0, 10) ?? "", endDate: source.data.endDate?.toISOString().slice(0, 10) ?? "", groupLeaderName: "", groupLeaderPhone: "", vehiclePlate: "", driverName: "", driverPhone: "", tourGuideName: source.data.tourGuideName ?? "", tourGuidePhone: source.data.tourGuidePhone ?? "", guides: source.guides.map((guide, index) => ({ id: `source-guide-${index}`, tourGuideId: guide.tourGuideId ?? "", name: guide.name, phone: guide.phone ?? "" })), closingText: "Hẹn gặp lại Quý khách trong những chuyến hành trình tiếp theo.", headerTemplateId: source.templates.headerTemplateId ?? "", footerTemplateId: source.templates.footerTemplateId ?? "", days: source.days.map((day, index) => ({ id: `source-${index}`, dayLabel: day.dayLabel, date: day.date.toISOString().slice(0, 10), title: day.title, breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner, content: day.content ?? "", accommodation: day.accommodation ?? "", notes: day.notes ?? "" })), inclusions: source.items.filter((item) => item.type === "INCLUSION").map((item) => item.content), exclusions: source.items.filter((item) => item.type === "EXCLUSION").map((item) => item.content) };
}

async function parse(formData: FormData) {
  const data = schema.parse(Object.fromEntries([...schema.keyof().options].map((key) => [key, String(formData.get(key) ?? "")])));
  const days = Array.from({ length: data.rowCount }, (_, index) => ({ dayLabel: String(formData.get(`dayLabel_${index}`) ?? "").trim(), date: dateOrNull(String(formData.get(`dayDate_${index}`) ?? "") || null), title: String(formData.get(`dayTitle_${index}`) ?? "").trim(), breakfast: formData.has(`breakfast_${index}`), lunch: formData.has(`lunch_${index}`), dinner: formData.has(`dinner_${index}`), content: String(formData.get(`dayContent_${index}`) ?? "").trim() || null, accommodation: String(formData.get(`accommodation_${index}`) ?? "").trim() || null, notes: String(formData.get(`dayNotes_${index}`) ?? "").trim() || null, displayOrder: index }));
  if (days.some((day) => !day.dayLabel || !day.title)) throw new Error("Vui lòng nhập nhãn ngày và tên lịch trình cho tất cả các ngày.");
  const guides = Array.from({ length: data.guideCount }, (_, index) => ({ tourGuideId: String(formData.get(`guideId_${index}`) ?? "") || null, name: String(formData.get(`guideName_${index}`) ?? "").trim(), phone: String(formData.get(`guidePhone_${index}`) ?? "").trim() || null, displayOrder: index }));
  if (guides.some((guide) => !guide.name)) throw new Error("Vui lòng nhập tên cho tất cả hướng dẫn viên.");
  const guideIds = [...new Set(guides.flatMap((guide) => guide.tourGuideId ? [guide.tourGuideId] : []))];
  if (guideIds.length && await prisma.tourGuide.count({ where: { id: { in: guideIds } } }) !== guideIds.length) throw new Error("Danh sách hướng dẫn viên có dữ liệu không hợp lệ.");
  const items = [["INCLUSION", data.inclusionCount], ["EXCLUSION", data.exclusionCount]] as const;
  const detailItems = items.flatMap(([type, count]) => Array.from({ length: count }, (_, index) => String(formData.get(`${type.toLowerCase()}_${index}`) ?? "").trim()).filter(Boolean).map((content, displayOrder) => ({ type, content, displayOrder })));
  const headerTemplateId = String(formData.get("headerTemplateId") ?? "") || null; const footerTemplateId = String(formData.get("footerTemplateId") ?? "") || null;
  const [header, footer] = await Promise.all([headerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: headerTemplateId, type: "HEADER", active: true } }) : null, footerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: footerTemplateId, type: "FOOTER", active: true } }) : null]);
  if (headerTemplateId && !header) throw new Error("Mẫu Header không hợp lệ."); if (footerTemplateId && !footer) throw new Error("Mẫu Footer không hợp lệ.");
  const templates = { headerTemplateId: header?.id ?? null, headerContent: header?.content ?? null, headerImageFolderId: header?.imageFolderId ?? null, headerImageStoredName: header?.imageStoredName ?? null, headerImageMimeType: header?.imageMimeType ?? null, headerImageAlt: header?.imageAlt ?? null, footerTemplateId: footer?.id ?? null, footerContent: footer?.content ?? null, footerImageFolderId: footer?.imageFolderId ?? null, footerImageStoredName: footer?.imageStoredName ?? null, footerImageMimeType: footer?.imageMimeType ?? null, footerImageAlt: footer?.imageAlt ?? null };
  const { rowCount: _rowCount, guideCount: _guideCount, inclusionCount: _inclusionCount, exclusionCount: _exclusionCount, ...program } = data;
  return { data: { ...program, tourGuideName: guides[0]?.name ?? null, tourGuidePhone: guides[0]?.phone ?? null, startDate: dateOrNull(data.startDate), endDate: dateOrNull(data.endDate) }, days, guides, items: detailItems, templates, sourceItineraryId: String(formData.get("sourceItineraryId") ?? "") || null };
}

export async function createQuickTourProgram(_: QuickTourProgramState, formData: FormData): Promise<QuickTourProgramState> { let id: string; try { const actor = await requireUser(); const { data, days, guides, items, templates, sourceItineraryId } = await parse(formData); if (sourceItineraryId) await requireSourceAccess(actor, sourceItineraryId); const item = await prisma.quickTourProgram.create({ data: { ...data, ...templates, sourceItineraryId, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName, updatedByType: actor.root ? "ROOT" : "USER", updatedById: actor.id, updatedByName: actor.fullName, days: { create: days }, guides: { create: guides }, items: { create: items } } }); id = item.id; } catch (error) { if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin chương trình tour." }; return { error: error instanceof Error ? error.message : "Không thể lưu chương trình tour." }; } redirect(`/quick/tour-programs/${id}`); }

export async function updateQuickTourProgram(id: string, _: QuickTourProgramState, formData: FormData): Promise<QuickTourProgramState> { try { const actor = await requireUser(); const current = await prisma.quickTourProgram.findUnique({ where: { id }, select: { createdById: true } }); if (!current || (actor.role !== "ADMIN" && current.createdById !== actor.id)) throw new Error("Không tìm thấy chương trình tour hoặc bạn không có quyền sửa."); const { data, days, guides, items, templates } = await parse(formData); await prisma.$transaction(async (tx) => { await tx.quickTourProgramDay.deleteMany({ where: { programId: id } }); await tx.quickTourProgramGuide.deleteMany({ where: { programId: id } }); await tx.quickTourProgramItem.deleteMany({ where: { programId: id } }); await tx.quickTourProgram.update({ where: { id }, data: { ...data, ...templates, updatedByType: actor.root ? "ROOT" : "USER", updatedById: actor.id, updatedByName: actor.fullName, days: { create: days }, guides: { create: guides }, items: { create: items } } }); }); } catch (error) { if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin chương trình tour." }; return { error: error instanceof Error ? error.message : "Không thể cập nhật chương trình tour." }; } redirect(`/quick/tour-programs/${id}`); }

export async function deleteQuickTourProgram(id: string) { const actor = await requireUser(); const current = await prisma.quickTourProgram.findUnique({ where: { id }, select: { createdById: true } }); if (!current || (actor.role !== "ADMIN" && current.createdById !== actor.id)) throw new Error("Không tìm thấy chương trình tour hoặc bạn không có quyền xóa."); await prisma.quickTourProgram.delete({ where: { id } }); redirect("/quick/tour-programs"); }

export async function regenerateQuickTourProgramFromItinerary(id: string) {
  const actor = await requireUser(); const current = await prisma.quickTourProgram.findUnique({ where: { id }, select: { createdById: true, sourceItineraryId: true } });
  if (!current || !current.sourceItineraryId || (actor.role !== "ADMIN" && current.createdById !== actor.id)) throw new Error("Không tìm thấy chương trình Tour liên kết với lịch trình.");
  const source = await requireSourceAccess(actor, current.sourceItineraryId);
  await prisma.$transaction(async (tx) => { await tx.quickTourProgramDay.deleteMany({ where: { programId: id } }); await tx.quickTourProgramGuide.deleteMany({ where: { programId: id } }); await tx.quickTourProgramItem.deleteMany({ where: { programId: id } }); await tx.quickTourProgram.update({ where: { id }, data: { ...source.data, ...source.templates, updatedByType: actor.root ? "ROOT" : "USER", updatedById: actor.id, updatedByName: actor.fullName, days: { create: source.days }, guides: { create: source.guides }, items: { create: source.items } } }); });
  redirect(`/quick/tour-programs/${id}?edit=1`);
}
