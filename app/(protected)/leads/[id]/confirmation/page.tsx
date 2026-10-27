import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { saveLeadConfirmation } from "@/app/actions/lead-confirmations";
import { LeadConfirmationDocument } from "@/components/lead-confirmation-document";
import { LeadConfirmationForm } from "@/components/lead-confirmation-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getLeadFieldAccess, hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

function durationDays(value: string | null) { const match = value?.trim().match(/\d+/); return Math.min(100, Math.max(1, match ? Number.parseInt(match[0], 10) : 1)); }
function addDays(value: Date, offset: number) { const result = new Date(value); result.setUTCDate(result.getUTCDate() + offset); return result.toISOString().slice(0, 10); }
const value = (input: string | null | undefined) => input ?? "";

export default async function LeadConfirmationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const actor = await requireUser(); const { id } = await params; const { edit } = await searchParams;
  const [canRead, canUpdate, fieldAccess] = await Promise.all([hasResourceAction(actor, "LEADS", "READ"), hasResourceAction(actor, "LEADS", "UPDATE"), getLeadFieldAccess(actor)]);
  if (!canRead) redirect("/");
  if (!["leadId", "duration", "travelDate", "destination"].every((field) => fieldAccess.readable.has(field))) redirect(`/leads/${id}`);
  const lead = await prisma.lead.findUnique({ where: { id }, include: { confirmation: { include: { days: { orderBy: { dayNumber: "asc" } } } }, quickItinerary: { include: { days: { orderBy: { dayNumber: "asc" } } } } } });
  if (!lead) notFound();
  const confirmation = lead.confirmation;
  const editing = edit === "1" || !confirmation;
  if (editing) {
    if (!canUpdate) redirect(`/leads/${id}/confirmation`);
    if (!lead.travelDate) return <div className="space-y-5"><Link href={`/leads/${lead.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Lead {lead.leadId}</Link><Card className="p-5"><h1 className="text-xl font-semibold">Lead chưa có Travel Date</h1><p className="text-sm text-muted-foreground">Vui lòng cập nhật Travel Date trước khi tạo các dòng Information Details.</p></Card></div>;
    const count = durationDays(lead.duration); const sharedItinerary = lead.quickItinerary;
    const selectedIds = [sharedItinerary?.headerTemplateId, sharedItinerary?.footerTemplateId].filter((item): item is string => Boolean(item));
    const templates = await prisma.documentTemplate.findMany({ where: { type: { in: ["HEADER", "FOOTER"] }, OR: [{ active: true }, { id: { in: selectedIds } }] }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
    const initial = { numberOfGuests: value(confirmation?.numberOfGuests) || (fieldAccess.readable.has("numberOfPax") && lead.numberOfPax !== null ? String(lead.numberOfPax) : ""), numberOfRooms: value(confirmation?.numberOfRooms), nationality: value(confirmation?.nationality) || (fieldAccess.readable.has("country") ? value(lead.country) : ""), guide: value(confirmation?.guide), notes: value(confirmation?.notes), headerTemplateId: sharedItinerary?.headerTemplateId ?? "", footerTemplateId: sharedItinerary?.footerTemplateId ?? "", days: Array.from({ length: count }, (_, index) => { const current = confirmation?.days[index]; const shared = sharedItinerary?.days[index]; return { dayNumber: index + 1, date: addDays(lead.travelDate!, index), itinerary: value(current?.itinerary), meals: value(current?.meals), transferGuide: value(current?.transferGuide), hotelInformation: value(current?.hotelInformation), title: shared?.title ?? (lead.destination?.trim() || "Destination"), transport: value(shared?.transport) || "Private Car", flight: value(shared?.flight), tourGuide: shared?.tourGuide ?? false, breakfast: shared?.breakfast ?? false, lunch: shared?.lunch ?? false, dinner: shared?.dinner ?? false, startLocation: value(shared?.startLocation), endLocation: value(shared?.endLocation), activityLocation: value(shared?.activityLocation) || value(lead.destination), accommodation: value(shared?.accommodation), description: value(shared?.description), notes: value(shared?.notes) }; }) };
    const options = templates.map(({ id: templateId, name, type, isDefault, active }) => ({ id: templateId, name, type, isDefault, active }));
    return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={confirmation ? `/leads/${lead.id}/confirmation` : `/leads/${lead.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Quay lại</Link><h1 className="mt-2 text-2xl font-semibold">{confirmation ? "Sửa" : "Tạo"} Confirmation</h1><p className="text-sm text-muted-foreground">MÃ ĐOÀN {lead.leadId} ({lead.duration || "—"}) · {count} ngày tự sinh từ Travel Date và Duration.</p></div></div><LeadConfirmationForm action={saveLeadConfirmation.bind(null, lead.id)} initial={initial} headers={options.filter((item) => item.type === "HEADER")} footers={options.filter((item) => item.type === "FOOTER")} /></div>;
  }
  const itinerary = lead.quickItinerary;
  if (!itinerary) return <Card className="p-5">Không tìm thấy dữ liệu lịch trình dùng chung của Confirmation.</Card>;
  const values: Record<string, string> = { companyName: "LA PASSION TRAVEL", itineraryTitle: itinerary.title, createdByName: itinerary.createdByName, updatedAt: itinerary.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) };
  const renderTemplate = (content: string | null) => content?.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, key: string) => values[key] ?? match) ?? null;
  const itineraryData = { title: itinerary.title, headerImageUrl: itinerary.headerImageStoredName ? `/api/quick-itinerary-assets/${itinerary.id}/header` : null, headerContent: renderTemplate(itinerary.headerContent), footerImageUrl: itinerary.footerImageStoredName ? `/api/quick-itinerary-assets/${itinerary.id}/footer` : null, footerContent: renderTemplate(itinerary.footerContent), inclusions: itinerary.inclusions, exclusions: itinerary.exclusions, informationNotes: itinerary.informationNotes, days: itinerary.days.map((day) => ({ dayNumber: day.dayNumber, date: day.date.toISOString().slice(0, 10), title: day.title, transport: day.transport, flight: day.flight, tourGuide: day.tourGuide, overnight: day.overnight, overnightLocation: day.overnightLocation, breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner, accommodation: day.accommodation, activityLocation: day.activityLocation, startLocation: day.startLocation, endLocation: day.endLocation, description: day.description, notes: day.notes })) };
  const confirmationData = { groupCode: `${lead.leadId} (${lead.duration || "—"})`, numberOfGuests: confirmation.numberOfGuests, numberOfRooms: confirmation.numberOfRooms, nationality: confirmation.nationality, guide: confirmation.guide, essentialTravelInfo: confirmation.essentialTravelInfo, notes: confirmation.notes, days: confirmation.days.map((day) => ({ dayNumber: day.dayNumber, date: day.date.toISOString().slice(0, 10), itinerary: day.itinerary, meals: day.meals, transferGuide: day.transferGuide, hotelInformation: day.hotelInformation })) };
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/leads/${lead.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Quay lại Lead</Link>{canUpdate && <Button nativeButton={false} render={<Link href={`/leads/${lead.id}/confirmation?edit=1`} />} variant="outline"><Pencil />Sửa Confirmation</Button>}</div><LeadConfirmationDocument confirmation={confirmationData} itinerary={itineraryData} /></div>;
}
