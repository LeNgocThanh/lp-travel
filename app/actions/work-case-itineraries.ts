"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workCaseScope } from "@/lib/work-case-access";

const createSchema = z.object({
  title: z.string().trim().min(2).max(150),
  rowCount: z.coerce.number().int().min(1).max(100),
});

const daySchema = z.object({
  id: z.string().min(1),
  date: z.string().date(),
  title: z.string().trim().min(2).max(200),
  transport: z.string().trim().max(200).transform((value) => value || null),
  flight: z.string().trim().max(500).transform((value) => value || null),
  startLocation: z.string().trim().max(200).transform((value) => value || null),
  endLocation: z.string().trim().max(200).transform((value) => value || null),
  activityLocation: z.string().trim().max(500).transform((value) => value || null),
  accommodation: z.string().trim().max(200).transform((value) => value || null),
  overnightLocation: z.string().trim().max(200).transform((value) => value || null),
  description: z.string().trim().max(20000).transform((value) => value || null),
  notes: z.string().trim().max(5000).transform((value) => value || null),
});

const addDaySchema = z.object({
  sourceItineraryDayId: z.string().min(1),
  date: z.string().date(),
  transport: z.string().trim().max(200).transform((value) => value || null),
  flight: z.string().trim().max(500).transform((value) => value || null),
  overnightLocation: z.string().trim().max(200).transform((value) => value || null),
});

async function accessibleWorkCase(workCaseId: string) {
  const actor = await requireUser();
  const workCase = await prisma.workCase.findFirst({
    where: { id: workCaseId, ...(await workCaseScope(actor)) },
    include: { items: { select: { productId: true } }, itinerary: { select: { id: true, headerTemplateId: true, footerTemplateId: true } } },
  });
  if (!workCase) throw new Error("Không tìm thấy hồ sơ hoặc bạn không có quyền.");
  if (["COMPLETED", "CANCELLED"].includes(workCase.status)) throw new Error("Không thể sửa lịch trình của hồ sơ đã kết thúc.");
  return { actor, workCase };
}

export async function generateWorkCaseItinerary(workCaseId: string, formData: FormData) {
  const { actor, workCase } = await accessibleWorkCase(workCaseId);
  if (workCase.itinerary) throw new Error("Hồ sơ đã có bản lịch trình.");
  const data = createSchema.parse({ title: formData.get("title"), rowCount: formData.get("rowCount") });
  const productIds = workCase.items.map((item) => item.productId).filter((id): id is string => Boolean(id));
  const sourceIds = Array.from({ length: data.rowCount }, (_, index) => String(formData.get(`sourceItineraryDayId_${index}`) ?? ""));
  if (sourceIds.some((id) => !id)) throw new Error("Vui lòng chọn lịch trình mẫu cho tất cả các ngày.");
  const sources = await prisma.productItineraryDay.findMany({
    where: { id: { in: sourceIds }, productId: { in: productIds } },
  });
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  if (sourceMap.size !== new Set(sourceIds).size) throw new Error("Có lịch trình mẫu không thuộc tour/dịch vụ của hồ sơ.");
  const headerTemplateId = String(formData.get("headerTemplateId") ?? "") || null;
  const footerTemplateId = String(formData.get("footerTemplateId") ?? "") || null;
  const [headerTemplate, footerTemplate, information] = await Promise.all([
    headerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: headerTemplateId, type: "HEADER", active: true } }) : null,
    footerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: footerTemplateId, type: "FOOTER", active: true } }) : null,
    prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } }),
  ]);
  if (headerTemplateId && !headerTemplate) throw new Error("Mẫu Header không hợp lệ hoặc đã được lưu trữ.");
  if (footerTemplateId && !footerTemplate) throw new Error("Mẫu Footer không hợp lệ hoặc đã được lưu trữ.");

  const days = sourceIds.map((sourceId, index) => {
    const source = sourceMap.get(sourceId);
    if (!source) throw new Error(`Lịch trình mẫu ở ngày ${index + 1} không hợp lệ.`);
    const date = String(formData.get(`date_${index}`) ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Ngày khởi hành ở dòng ${index + 1} không hợp lệ.`);
    const overnight = formData.has(`overnight_${index}`);
    const overnightLocation = String(formData.get(`overnightLocation_${index}`) ?? "").trim() || null;
    if (overnight && !overnightLocation) throw new Error(`Vui lòng nhập địa điểm nghỉ đêm ở ngày ${index + 1}.`);
    return {
      sourceItineraryDayId: source.id,
      dayNumber: index + 1,
      date: new Date(`${date}T00:00:00.000Z`),
      title: source.title || `Ngày ${index + 1}`,
      transport: String(formData.get(`transport_${index}`) ?? "").trim() || null,
      flight: String(formData.get(`flight_${index}`) ?? "").trim() || source.flight,
      startLocation: source.startLocation,
      endLocation: source.endLocation,
      activityLocation: source.activityLocation,
      accommodation: source.accommodation,
      breakfast: formData.has(`breakfast_${index}`),
      lunch: formData.has(`lunch_${index}`),
      dinner: formData.has(`dinner_${index}`),
      tourGuide: formData.has(`tourGuide_${index}`),
      overnight,
      overnightLocation,
      description: source.description,
      notes: source.notes,
      metadata: source.metadata as Prisma.InputJsonValue,
    };
  });

  await prisma.$transaction(async (tx) => {
    await tx.workCaseItinerary.create({
      data: {
        workCaseId,
        title: data.title,
        headerTemplateId: headerTemplate?.id,
        headerContent: headerTemplate?.content,
        headerMetadata: (headerTemplate?.metadata ?? {}) as Prisma.InputJsonValue,
        headerImageFolderId: headerTemplate?.imageFolderId,
        headerImageStoredName: headerTemplate?.imageStoredName,
        headerImageMimeType: headerTemplate?.imageMimeType,
        headerImageAlt: headerTemplate?.imageAlt,
        footerTemplateId: footerTemplate?.id,
        footerContent: footerTemplate?.content,
        footerMetadata: (footerTemplate?.metadata ?? {}) as Prisma.InputJsonValue,
        footerImageFolderId: footerTemplate?.imageFolderId,
        footerImageStoredName: footerTemplate?.imageStoredName,
        footerImageMimeType: footerTemplate?.imageMimeType,
        footerImageAlt: footerTemplate?.imageAlt,
        inclusions: information?.inclusions || null,
        exclusions: information?.exclusions || null,
        informationNotes: information?.notes || null,
        createdByType: actor.root ? "ROOT" : "USER",
        createdById: actor.id,
        createdByName: actor.fullName,
        days: { create: days },
      },
    });
    await tx.workCaseActivity.create({
      data: {
        workCaseId,
        action: "ITINERARY_GENERATED",
        summary: `Đã tạo bản nháp lịch trình gồm ${days.length} ngày`,
        actorType: actor.root ? "ROOT" : "USER",
        actorId: actor.id,
        actorName: actor.fullName,
      },
    });
  });
  revalidatePath(`/work/${workCaseId}`);
  revalidatePath(`/work/${workCaseId}/itinerary`);
}

export async function saveWorkCaseItineraryDraft(workCaseId: string, formData: FormData) {
  const { actor, workCase } = await accessibleWorkCase(workCaseId);
  if (!workCase.itinerary) throw new Error("Hồ sơ chưa có bản lịch trình.");
  const title = z.string().trim().min(2).max(150).parse(formData.get("title"));
  const headerTemplateId = String(formData.get("headerTemplateId") ?? "") || null;
  const footerTemplateId = String(formData.get("footerTemplateId") ?? "") || null;
  const refreshHeader = formData.has("refreshHeader");
  const refreshFooter = formData.has("refreshFooter");
  const headerChanged = headerTemplateId !== workCase.itinerary.headerTemplateId;
  const footerChanged = footerTemplateId !== workCase.itinerary.footerTemplateId;
  const [headerTemplate, footerTemplate] = await Promise.all([
    headerTemplateId && (headerChanged || refreshHeader) ? prisma.documentTemplate.findFirst({ where: { id: headerTemplateId, type: "HEADER", active: true } }) : null,
    footerTemplateId && (footerChanged || refreshFooter) ? prisma.documentTemplate.findFirst({ where: { id: footerTemplateId, type: "FOOTER", active: true } }) : null,
  ]);
  if (headerTemplateId && (headerChanged || refreshHeader) && !headerTemplate) throw new Error("Mẫu Header không hợp lệ hoặc đã được lưu trữ.");
  if (footerTemplateId && (footerChanged || refreshFooter) && !footerTemplate) throw new Error("Mẫu Footer không hợp lệ hoặc đã được lưu trữ.");
  const dayIds = formData.getAll("dayId").map(String);
  const currentDays = await prisma.workCaseItineraryDay.findMany({
    where: { itineraryId: workCase.itinerary.id },
    select: { id: true, sourceItineraryDayId: true },
  });
  if (dayIds.length !== currentDays.length || dayIds.some((id) => !currentDays.some((day) => day.id === id))) {
    throw new Error("Danh sách ngày không hợp lệ. Vui lòng tải lại trang.");
  }
  const productIds = workCase.items.map((item) => item.productId).filter((id): id is string => Boolean(id));
  const regenerateIds = dayIds.filter((id) => formData.has(`regenerate_${id}`));
  const regenerateSourceIds = regenerateIds.map((id) => String(formData.get(`sourceItineraryDayId_${id}`) ?? ""));
  if (regenerateSourceIds.some((id) => !id)) throw new Error("Vui lòng chọn lịch trình mẫu cho ngày cần gen lại.");
  const regenerateSources = await prisma.productItineraryDay.findMany({ where: { id: { in: regenerateSourceIds }, productId: { in: productIds } } });
  const regenerateSourceMap = new Map(regenerateSources.map((source) => [source.id, source]));
  if (regenerateSourceMap.size !== new Set(regenerateSourceIds).size) throw new Error("Có lịch trình mẫu cần gen lại không thuộc tour/dịch vụ của hồ sơ.");
  const currentDayMap = new Map(currentDays.map((day) => [day.id, day]));
  const days = dayIds.map((id, index) => {
    const manual = daySchema.parse({
      id,
      date: formData.get(`date_${id}`),
      title: formData.get(`dayTitle_${id}`),
      transport: String(formData.get(`transport_${id}`) ?? ""),
      flight: String(formData.get(`flight_${id}`) ?? ""),
      startLocation: String(formData.get(`startLocation_${id}`) ?? ""),
      endLocation: String(formData.get(`endLocation_${id}`) ?? ""),
      activityLocation: String(formData.get(`activityLocation_${id}`) ?? ""),
      accommodation: String(formData.get(`accommodation_${id}`) ?? ""),
      description: String(formData.get(`description_${id}`) ?? ""),
      notes: String(formData.get(`notes_${id}`) ?? ""),
      overnightLocation: String(formData.get(`overnightLocation_${id}`) ?? ""),
    });
    const sourceId = String(formData.get(`sourceItineraryDayId_${id}`) ?? "");
    const source = formData.has(`regenerate_${id}`) ? regenerateSourceMap.get(sourceId) : null;
    const overnight = formData.has(`overnight_${id}`);
    if (overnight && !manual.overnightLocation) throw new Error(`Vui lòng nhập địa điểm nghỉ đêm ở ngày ${index + 1}.`);
    return {
      ...manual,
      sourceItineraryDayId: source?.id ?? currentDayMap.get(id)?.sourceItineraryDayId ?? null,
      dayNumber: index + 1,
      title: source?.title || manual.title,
      startLocation: source ? source.startLocation : manual.startLocation,
      endLocation: source ? source.endLocation : manual.endLocation,
      activityLocation: source ? source.activityLocation : manual.activityLocation,
      accommodation: source ? source.accommodation : manual.accommodation,
      flight: source && formData.has(`regenerate_${id}`) ? source.flight : manual.flight,
      description: source ? source.description : manual.description,
      notes: source ? source.notes : manual.notes,
      metadata: source?.metadata as Prisma.InputJsonValue | undefined,
      breakfast: formData.has(`breakfast_${id}`),
      lunch: formData.has(`lunch_${id}`),
      dinner: formData.has(`dinner_${id}`),
      tourGuide: formData.has(`tourGuide_${id}`),
      overnight,
    };
  });

  await prisma.$transaction(async (tx) => {
    await tx.workCaseItinerary.update({ where: { id: workCase.itinerary!.id }, data: {
      title,
      status: "DRAFT",
      headerTemplateId,
      footerTemplateId,
      ...(headerChanged || refreshHeader ? { headerContent: headerTemplate?.content ?? null, headerMetadata: (headerTemplate?.metadata ?? {}) as Prisma.InputJsonValue, headerImageFolderId: headerTemplate?.imageFolderId ?? null, headerImageStoredName: headerTemplate?.imageStoredName ?? null, headerImageMimeType: headerTemplate?.imageMimeType ?? null, headerImageAlt: headerTemplate?.imageAlt ?? null } : {}),
      ...(footerChanged || refreshFooter ? { footerContent: footerTemplate?.content ?? null, footerMetadata: (footerTemplate?.metadata ?? {}) as Prisma.InputJsonValue, footerImageFolderId: footerTemplate?.imageFolderId ?? null, footerImageStoredName: footerTemplate?.imageStoredName ?? null, footerImageMimeType: footerTemplate?.imageMimeType ?? null, footerImageAlt: footerTemplate?.imageAlt ?? null } : {}),
    } });
    for (const day of days) {
      await tx.workCaseItineraryDay.update({
        where: { id: day.id },
        data: {
          dayNumber: day.dayNumber,
          sourceItineraryDayId: day.sourceItineraryDayId,
          date: new Date(`${day.date}T00:00:00.000Z`),
          title: day.title,
          transport: day.transport,
          flight: day.flight,
          startLocation: day.startLocation,
          endLocation: day.endLocation,
          activityLocation: day.activityLocation,
          accommodation: day.accommodation,
          breakfast: day.breakfast,
          lunch: day.lunch,
          dinner: day.dinner,
          tourGuide: day.tourGuide,
          overnight: day.overnight,
          overnightLocation: day.overnightLocation,
          description: day.description,
          notes: day.notes,
          ...(day.metadata !== undefined ? { metadata: day.metadata } : {}),
        },
      });
    }
    await tx.workCaseActivity.create({
      data: {
        workCaseId,
        action: "ITINERARY_DRAFT_SAVED",
        summary: "Đã lưu nháp lịch trình",
        actorType: actor.root ? "ROOT" : "USER",
        actorId: actor.id,
        actorName: actor.fullName,
      },
    });
  });
  revalidatePath(`/work/${workCaseId}`);
  revalidatePath(`/work/${workCaseId}/itinerary`);
}

export async function addWorkCaseItineraryDay(workCaseId: string, formData: FormData) {
  const { actor, workCase } = await accessibleWorkCase(workCaseId);
  if (!workCase.itinerary) throw new Error("Hồ sơ chưa có bản lịch trình.");
  const data = addDaySchema.parse({
    sourceItineraryDayId: formData.get("sourceItineraryDayId"),
    date: formData.get("date"),
    transport: String(formData.get("transport") ?? ""),
    flight: String(formData.get("flight") ?? ""),
    overnightLocation: String(formData.get("overnightLocation") ?? ""),
  });
  const productIds = workCase.items.map((item) => item.productId).filter((id): id is string => Boolean(id));
  const [source, lastDay] = await Promise.all([
    prisma.productItineraryDay.findFirst({ where: { id: data.sourceItineraryDayId, productId: { in: productIds } } }),
    prisma.workCaseItineraryDay.findFirst({ where: { itineraryId: workCase.itinerary.id }, orderBy: { dayNumber: "desc" }, select: { dayNumber: true } }),
  ]);
  if (!source) throw new Error("Lịch trình mẫu không thuộc tour/dịch vụ của hồ sơ.");
  const overnight = formData.has("overnight");
  if (overnight && !data.overnightLocation) throw new Error("Vui lòng nhập địa điểm nghỉ đêm.");
  const dayNumber = (lastDay?.dayNumber ?? 0) + 1;
  await prisma.$transaction([
    prisma.workCaseItineraryDay.create({ data: {
      itineraryId: workCase.itinerary.id,
      sourceItineraryDayId: source.id,
      dayNumber,
      date: new Date(`${data.date}T00:00:00.000Z`),
      title: source.title || `Ngày ${dayNumber}`,
      transport: data.transport,
      flight: data.flight || source.flight,
      startLocation: source.startLocation,
      endLocation: source.endLocation,
      activityLocation: source.activityLocation,
      accommodation: source.accommodation,
      breakfast: formData.has("breakfast"),
      lunch: formData.has("lunch"),
      dinner: formData.has("dinner"),
      tourGuide: formData.has("tourGuide"),
      overnight,
      overnightLocation: data.overnightLocation,
      description: source.description,
      notes: source.notes,
      metadata: source.metadata as Prisma.InputJsonValue,
    } }),
    prisma.workCaseActivity.create({ data: {
      workCaseId,
      action: "ITINERARY_DAY_ADDED",
      summary: `Đã thêm ngày ${dayNumber} vào lịch trình`,
      actorType: actor.root ? "ROOT" : "USER",
      actorId: actor.id,
      actorName: actor.fullName,
    } }),
  ]);
  revalidatePath(`/work/${workCaseId}`);
  revalidatePath(`/work/${workCaseId}/itinerary`);
}
