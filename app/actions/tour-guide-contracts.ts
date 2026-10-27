"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

export type TourGuideContractState = { error?: string } | undefined;

const schema = z.object({
  contractNumber: z.string().trim().min(1).max(100),
  contractDate: z.string().date(),
  signerUserId: z.string().min(1),
  signerTitle: z.string().trim().min(1).max(150),
  authorizationNumber: z.string().trim().max(100).transform((value) => value || null),
  dailyRateVnd: z.coerce.number().min(0).max(1000000000000),
  advanceAmountVnd: z.coerce.number().min(0).max(1000000000000),
  journeyContent: z.string().trim().min(1).max(50000),
  otherAgreements: z.string().trim().max(50000).transform((value) => value || null),
  headerTemplateId: z.string().trim().transform((value) => value || null),
  footerTemplateId: z.string().trim().transform((value) => value || null),
});

const formValues = (formData: FormData) => schema.parse({ contractNumber: formData.get("contractNumber"), contractDate: formData.get("contractDate"), signerUserId: formData.get("signerUserId"), signerTitle: formData.get("signerTitle"), authorizationNumber: String(formData.get("authorizationNumber") ?? ""), dailyRateVnd: formData.get("dailyRateVnd"), advanceAmountVnd: formData.get("advanceAmountVnd"), journeyContent: formData.get("journeyContent"), otherAgreements: String(formData.get("otherAgreements") ?? ""), headerTemplateId: String(formData.get("headerTemplateId") ?? ""), footerTemplateId: String(formData.get("footerTemplateId") ?? "") });

async function templateSnapshots(headerTemplateId: string | null, footerTemplateId: string | null) {
  const [header, footer] = await Promise.all([headerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: headerTemplateId, type: "HEADER", active: true } }) : null, footerTemplateId ? prisma.documentTemplate.findFirst({ where: { id: footerTemplateId, type: "FOOTER", active: true } }) : null]);
  if (headerTemplateId && !header) throw new Error("Mẫu Header không hợp lệ hoặc đã được lưu trữ.");
  if (footerTemplateId && !footer) throw new Error("Mẫu Footer không hợp lệ hoặc đã được lưu trữ.");
  return { headerTemplateId: header?.id ?? null, headerContent: header?.content ?? null, headerImageFolderId: header?.imageFolderId ?? null, headerImageStoredName: header?.imageStoredName ?? null, headerImageMimeType: header?.imageMimeType ?? null, headerImageAlt: header?.imageAlt ?? null, footerTemplateId: footer?.id ?? null, footerContent: footer?.content ?? null, footerImageFolderId: footer?.imageFolderId ?? null, footerImageStoredName: footer?.imageStoredName ?? null, footerImageMimeType: footer?.imageMimeType ?? null, footerImageAlt: footer?.imageAlt ?? null };
}

export async function createTourGuideContract(itineraryId: string, tourGuideId: string, _: TourGuideContractState, formData: FormData): Promise<TourGuideContractState> {
  let contractId: string;
  try {
    const actor = await requireUser();
    await requireResourceAction(actor, "LEADS", "UPDATE");
    const data = formValues(formData);
    const templates = await templateSnapshots(data.headerTemplateId, data.footerTemplateId);
    const [itinerary, setting, guide, signer] = await Promise.all([
      prisma.quickItinerary.findUnique({ where: { id: itineraryId }, select: { id: true, lead: { select: { id: true } }, b2bLead: { select: { id: true } }, days: { where: { tourGuides: { some: { tourGuideId } } }, orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, date: true, title: true, guidePickup: true, guidePickupNote: true, guideDropoff: true, guideDropoffNote: true } } } }),
      prisma.tourGuideContractSetting.findUnique({ where: { id: "default" } }),
      prisma.tourGuide.findUnique({ where: { id: tourGuideId } }),
      prisma.user.findFirst({ where: { id: data.signerUserId, active: true }, select: { id: true, fullName: true } }),
    ]);
    if (!itinerary || (!itinerary.lead && !itinerary.b2bLead)) throw new Error("Hợp đồng hướng dẫn viên chỉ được tạo từ itinerary của Lead.");
    if (!setting) throw new Error("Chưa có cấu hình hợp đồng hướng dẫn viên.");
    if (!guide) throw new Error("Không tìm thấy hướng dẫn viên.");
    if (!signer) throw new Error("Người ký Bên A không hợp lệ.");
    if (!itinerary.days.length) throw new Error("Hướng dẫn viên chưa được gán vào ngày nào trong lịch trình.");
    const totalAmountVnd = data.dailyRateVnd * itinerary.days.length;
    const pickupDropoffContent = itinerary.days.flatMap((day) => [day.guidePickup ? `Ngày ${day.dayNumber} - Đón khách: ${day.guidePickupNote || "Có"}` : null, day.guideDropoff ? `Ngày ${day.dayNumber} - Trả khách: ${day.guideDropoffNote || "Có"}` : null].filter((value): value is string => Boolean(value))).join("\n") || null;
    const contract = await prisma.tourGuideContract.create({ data: {
      itineraryId, tourGuideId, ...templates, contractNumber: data.contractNumber, contractDate: new Date(`${data.contractDate}T00:00:00.000Z`), serviceStartDate: itinerary.days[0].date, serviceEndDate: itinerary.days[itinerary.days.length - 1].date,
      signerUserId: signer.id, signerName: signer.fullName, signerTitle: data.signerTitle, authorizationNumber: data.authorizationNumber, dailyRateVnd: data.dailyRateVnd, workingDayCount: itinerary.days.length, totalAmountVnd, advanceAmountVnd: data.advanceAmountVnd, journeyContent: data.journeyContent, pickupDropoffContent, otherAgreements: data.otherAgreements,
      companyName: setting.companyName, companyTaxCode: setting.taxCode, companyAddress: setting.address, legalRepresentative: setting.legalRepresentative, legalRepresentativeTitle: setting.legalRepresentativeTitle, companyBankName: setting.bankName, companyBankAccountNumber: setting.bankAccountNumber, signingPlace: setting.signingPlace, contractCopies: setting.contractCopies, legalBases: setting.legalBases,
      guideName: guide.fullName, guideGender: guide.gender, guideDateOfBirth: guide.dateOfBirth, guideIdentityNumber: guide.identityNumber, guidePermanentAddress: guide.permanentAddress, guideTaxCode: guide.taxCode, guidePhone: guide.phone, guideAccountName: guide.accountName, guideBankAccountNumber: guide.bankAccountNumber, guideBankName: guide.bankName,
      article4: setting.article4, article5: setting.article5, article6: setting.article6, article7: setting.article7, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName,
      days: { create: itinerary.days.map((day, index) => ({ itineraryDayId: day.id, dayNumber: day.dayNumber, serviceDate: day.date, title: day.title, displayOrder: index })) },
    } });
    contractId = contract.id;
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin hợp đồng." };
    if (error instanceof Error && error.message.includes("Unique constraint")) return { error: "Hướng dẫn viên này đã có hợp đồng trong lịch trình." };
    return { error: error instanceof Error ? error.message : "Không thể tạo hợp đồng hướng dẫn viên." };
  }
  redirect(`/quick/${itineraryId}/guide-contracts/${contractId}`);
}

export async function regenerateTourGuideContract(contractId: string) {
  const actor = await requireUser();
  await requireResourceAction(actor, "LEADS", "UPDATE");
  const [contract, setting] = await Promise.all([prisma.tourGuideContract.findUnique({ where: { id: contractId }, select: { itineraryId: true, tourGuideId: true, dailyRateVnd: true } }), prisma.tourGuideContractSetting.findUnique({ where: { id: "default" } })]);
  if (!contract) throw new Error("Không tìm thấy hợp đồng.");
  if (!setting) throw new Error("Chưa có cấu hình hợp đồng hướng dẫn viên.");
  const days = await prisma.quickItineraryDay.findMany({ where: { itineraryId: contract.itineraryId, tourGuides: { some: { tourGuideId: contract.tourGuideId } } }, orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, date: true, title: true, guidePickup: true, guidePickupNote: true, guideDropoff: true, guideDropoffNote: true } });
  if (!days.length) throw new Error("Hướng dẫn viên không còn được phân công vào ngày nào trong lịch trình.");
  const journeyContent = days.map((day) => `${new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(day.date)}: ${day.title}`).join("\n");
  const pickupDropoffContent = days.flatMap((day) => [day.guidePickup ? `Ngày ${day.dayNumber} - Đón khách: ${day.guidePickupNote || "Có"}` : null, day.guideDropoff ? `Ngày ${day.dayNumber} - Trả khách: ${day.guideDropoffNote || "Có"}` : null].filter((value): value is string => Boolean(value))).join("\n") || null;
  await prisma.$transaction(async (tx) => {
    await tx.tourGuideContractDay.deleteMany({ where: { contractId } });
    await tx.tourGuideContract.update({ where: { id: contractId }, data: { serviceStartDate: days[0].date, serviceEndDate: days[days.length - 1].date, workingDayCount: days.length, totalAmountVnd: contract.dailyRateVnd.mul(days.length), journeyContent, pickupDropoffContent, companyName: setting.companyName, companyTaxCode: setting.taxCode, companyAddress: setting.address, legalRepresentative: setting.legalRepresentative, legalRepresentativeTitle: setting.legalRepresentativeTitle, companyBankName: setting.bankName, companyBankAccountNumber: setting.bankAccountNumber, signingPlace: setting.signingPlace, contractCopies: setting.contractCopies, legalBases: setting.legalBases, article4: setting.article4, article5: setting.article5, article6: setting.article6, article7: setting.article7, days: { create: days.map((day, index) => ({ itineraryDayId: day.id, dayNumber: day.dayNumber, serviceDate: day.date, title: day.title, displayOrder: index })) } } });
  });
  redirect(`/quick/${contract.itineraryId}/guide-contracts/${contractId}`);
}

export async function updateTourGuideContract(contractId: string, _: TourGuideContractState, formData: FormData): Promise<TourGuideContractState> {
  let itineraryId: string;
  try {
    const actor = await requireUser();
    await requireResourceAction(actor, "LEADS", "UPDATE");
    const data = formValues(formData);
    const templates = await templateSnapshots(data.headerTemplateId, data.footerTemplateId);
    const [contract, signer] = await Promise.all([prisma.tourGuideContract.findUnique({ where: { id: contractId }, select: { itineraryId: true, workingDayCount: true } }), prisma.user.findFirst({ where: { id: data.signerUserId, active: true }, select: { id: true, fullName: true } })]);
    if (!contract) throw new Error("Không tìm thấy hợp đồng.");
    if (!signer) throw new Error("Người ký Bên A không hợp lệ.");
    itineraryId = contract.itineraryId;
    await prisma.tourGuideContract.update({ where: { id: contractId }, data: { ...templates, contractNumber: data.contractNumber, contractDate: new Date(`${data.contractDate}T00:00:00.000Z`), signerUserId: signer.id, signerName: signer.fullName, signerTitle: data.signerTitle, authorizationNumber: data.authorizationNumber, dailyRateVnd: data.dailyRateVnd, totalAmountVnd: data.dailyRateVnd * contract.workingDayCount, advanceAmountVnd: data.advanceAmountVnd, journeyContent: data.journeyContent, otherAgreements: data.otherAgreements } });
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại thông tin hợp đồng." };
    return { error: error instanceof Error ? error.message : "Không thể cập nhật hợp đồng hướng dẫn viên." };
  }
  redirect(`/quick/${itineraryId}/guide-contracts/${contractId}`);
}
