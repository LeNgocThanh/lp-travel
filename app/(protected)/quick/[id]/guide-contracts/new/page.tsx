import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createTourGuideContract } from "@/app/actions/tour-guide-contracts";
import { TourGuideContractForm } from "@/components/tour-guide-contract-form";
import { requireUser } from "@/lib/auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (date: Date) => new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);

export default async function NewTourGuideContractPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guideId?: string }> }) {
  const actor = await requireUser(); const { id } = await params; const { guideId } = await searchParams;
  if (!guideId || !await hasResourceAction(actor, "LEADS", "UPDATE")) notFound();
  const [item, setting, guide, users, existing, templates] = await Promise.all([
    prisma.quickItinerary.findUnique({ where: { id }, select: { lead: { select: { id: true, assignedToId: true } }, b2bLead: { select: { id: true, assignedToId: true } }, days: { where: { tourGuides: { some: { tourGuideId: guideId } } }, orderBy: { dayNumber: "asc" }, select: { date: true, title: true } } } }),
    prisma.tourGuideContractSetting.findUnique({ where: { id: "default" } }), prisma.tourGuide.findUnique({ where: { id: guideId }, select: { fullName: true } }), prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }), prisma.tourGuideContract.findUnique({ where: { itineraryId_tourGuideId: { itineraryId: id, tourGuideId: guideId } }, select: { id: true } }), prisma.documentTemplate.findMany({ where: { active: true, type: { in: ["HEADER", "FOOTER"] } }, select: { id: true, name: true, type: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
  ]);
  if (existing) redirect(`/quick/${id}/guide-contracts/${existing.id}`);
  if (!item || (!item.lead && !item.b2bLead) || !setting || !guide || !item.days.length) notFound();
  const leadId = item.lead?.id ?? item.b2bLead!.id;
  const assignedToId = item.lead?.assignedToId ?? item.b2bLead!.assignedToId;
  const journeyContent = item.days.map((day) => `${displayDate(day.date)}: ${day.title}`).join("\n");
  return <div className="space-y-5"><Link href={`/quick/${id}/guide-contracts`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Quay lại danh sách hợp đồng</Link><div><h1 className="text-2xl font-semibold">Tạo hợp đồng hướng dẫn viên</h1><p className="text-sm text-muted-foreground">Dữ liệu Bên A, Bên B và các ngày công sẽ được chụp lại khi lưu.</p></div><TourGuideContractForm action={createTourGuideContract.bind(null, id, guideId)} users={users} templates={templates} initial={{ contractNumber: leadId, contractDate: dateValue(item.days[0].date), serviceStartDate: dateValue(item.days[0].date), serviceEndDate: dateValue(item.days[item.days.length - 1].date), workingDayCount: item.days.length, signerUserId: assignedToId ?? "", signerTitle: setting.authorizedTitleDefault ?? setting.legalRepresentativeTitle, authorizationNumber: setting.authorizationNumber ?? "", dailyRateVnd: "0", advanceAmountVnd: "0", journeyContent, otherAgreements: "", guideName: guide.fullName, headerTemplateId: "", footerTemplateId: "" }} /></div>;
}
