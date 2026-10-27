import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createLeadItinerary } from "@/app/actions/quick-itineraries";
import { QuickItineraryForm } from "@/components/quick-itinerary-form";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

function durationDays(value: string | null) {
  const match = value?.trim().match(/\d+/);
  return Math.min(100, Math.max(1, match ? Number.parseInt(match[0], 10) : 1));
}

function addDays(value: Date | null, offset: number) {
  if (!value) return "";
  const result = new Date(value); result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

export default async function LeadItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  const [canRead, canUpdate, fieldAccess] = await Promise.all([hasResourceAction(user, "LEADS", "READ"), hasResourceAction(user, "LEADS", "UPDATE"), getLeadFieldAccess(user)]);
  if (!canRead) redirect("/");
  if (!canUpdate) redirect(`/leads/${id}`);
  if (!["duration", "travelDate", "destination"].every((field) => fieldAccess.readable.has(field))) redirect(`/leads/${id}`);
  const [lead, templates, tourGuides] = await Promise.all([
    prisma.lead.findUnique({ where: { id }, select: { id: true, leadId: true, duration: true, travelDate: true, destination: true, quickItinerary: { include: { days: { orderBy: { dayNumber: "asc" } } } } } }),
    prisma.documentTemplate.findMany({ where: { active: true, type: { in: ["HEADER", "FOOTER"] } }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.tourGuide.findMany({ select: { id: true, fullName: true, identityNumber: true }, orderBy: { fullName: "asc" } }),
  ]);
  if (!lead) notFound();
  if (lead.quickItinerary?.documentEnabled) redirect(`/quick/${lead.quickItinerary.id}?edit=1`);
  const count = durationDays(lead.duration); const destination = lead.destination?.trim() || "Destination";
  const days = lead.quickItinerary?.days.map((day) => ({ id: day.id, date: day.date.toISOString().slice(0, 10), title: day.title, transport: day.transport ?? "", flight: day.flight ?? "", tourGuide: day.tourGuide, tourGuideId: day.tourGuideId ?? "", guidePickup: day.guidePickup, guidePickupNote: day.guidePickupNote ?? "", guideDropoff: day.guideDropoff, guideDropoffNote: day.guideDropoffNote ?? "", overnight: day.overnight, overnightLocation: day.overnightLocation ?? "", breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner, startLocation: day.startLocation ?? "", endLocation: day.endLocation ?? "", activityLocation: day.activityLocation ?? "", accommodation: day.accommodation ?? "", description: day.description ?? "", notes: day.notes ?? "" })) ?? Array.from({ length: count }, (_, index) => ({ id: `lead-${index}`, date: addDays(lead.travelDate, index), title: destination, transport: "Private Car", flight: "", tourGuide: false, tourGuideId: "", guidePickup: false, guidePickupNote: "", guideDropoff: false, guideDropoffNote: "", overnight: false, overnightLocation: "", breakfast: false, lunch: false, dinner: false, startLocation: "", endLocation: "", activityLocation: destination, accommodation: "", description: "", notes: "" }));
  const options = templates.map(({ id: templateId, name, code, type, isDefault, active }) => ({ id: templateId, name, code, type, isDefault, active }));
  return <div className="space-y-6"><Link href={`/leads/${lead.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Lead {lead.leadId}</Link><div><h1 className="text-2xl font-semibold">Tạo lịch trình từ Lead</h1><p className="text-sm text-muted-foreground">Đã tạo trước {count} ngày từ Duration “{lead.duration || "trống"}”, bắt đầu theo Travel Date và dùng Destination làm tiêu đề.</p>{!lead.travelDate && <p className="mt-2 text-sm text-amber-700">Lead chưa có Travel Date. Vui lòng nhập ngày cho từng dòng trước khi lưu.</p>}</div><QuickItineraryForm action={createLeadItinerary.bind(null, lead.id)} headers={options.filter((item) => item.type === "HEADER")} footers={options.filter((item) => item.type === "FOOTER")} tourGuides={tourGuides} accommodationAsOvernight initial={{ title: lead.quickItinerary?.title ?? `ITINERARY - ${destination}`, headerTemplateId: lead.quickItinerary?.headerTemplateId ?? "", footerTemplateId: lead.quickItinerary?.footerTemplateId ?? "", days }} /></div>;
}
