import Link from "next/link";
import { ArrowLeft, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { deleteQuickTourProgram, regenerateQuickTourProgramFromItinerary, updateQuickTourProgram } from "@/app/actions/quick-tour-programs";
import { QuickTourProgramExportActions, type QuickTourProgramExportData } from "@/components/quick-tour-program-export-actions";
import { QuickTourProgramForm } from "@/components/quick-tour-program-form";
import { Button } from "@/components/ui/button";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dateValue = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "";
const displayDate = (date: Date | null) => date ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(date) : "—";
const meals = (day: { breakfast: boolean; lunch: boolean; dinner: boolean }) => [day.breakfast ? "Sáng" : null, day.lunch ? "Trưa" : null, day.dinner ? "Tối" : null].filter(Boolean).join("/") || "-/-/-";

export default async function QuickTourProgramPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const { edit } = await searchParams;
  const item = await prisma.quickTourProgram.findUnique({ where: { id }, include: { days: { orderBy: { displayOrder: "asc" } }, guides: { orderBy: { displayOrder: "asc" } }, items: { orderBy: [{ type: "asc" }, { displayOrder: "asc" }] } } });
  if (!item || (actor.role !== "ADMIN" && item.createdById !== actor.id)) notFound();
  const canEdit = actor.role === "ADMIN" || item.createdById === actor.id;

  if (edit === "1") {
    const [templates, tourGuides] = await Promise.all([
      prisma.documentTemplate.findMany({ where: { type: { in: ["HEADER", "FOOTER"] }, OR: [{ active: true }, { id: { in: [item.headerTemplateId, item.footerTemplateId].filter((value): value is string => Boolean(value)) } }] }, select: { id: true, name: true, type: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
      prisma.tourGuide.findMany({ select: { id: true, fullName: true, phone: true }, orderBy: { fullName: "asc" } }),
    ]);
    return <div className="space-y-5"><Link href={`/quick/tour-programs/${item.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Quay lại bản xem</Link><h1 className="text-2xl font-semibold">Sửa chương trình Tour</h1><QuickTourProgramForm action={updateQuickTourProgram.bind(null, item.id)} templates={templates} tourGuides={tourGuides} initial={{ sourceItineraryId: item.sourceItineraryId ?? undefined, title: item.title, durationText: item.durationText ?? "", transportText: item.transportText ?? "", departureText: item.departureText ?? "", programName: item.programName, tourCode: item.tourCode ?? "", guestSummary: item.guestSummary ?? "", startDate: dateValue(item.startDate), endDate: dateValue(item.endDate), groupLeaderName: item.groupLeaderName ?? "", groupLeaderPhone: item.groupLeaderPhone ?? "", vehiclePlate: item.vehiclePlate ?? "", driverName: item.driverName ?? "", driverPhone: item.driverPhone ?? "", tourGuideName: item.tourGuideName ?? "", tourGuidePhone: item.tourGuidePhone ?? "", guides: item.guides.map((guide) => ({ id: guide.id, tourGuideId: guide.tourGuideId ?? "", name: guide.name, phone: guide.phone ?? "" })), closingText: item.closingText ?? "", headerTemplateId: item.headerTemplateId ?? "", footerTemplateId: item.footerTemplateId ?? "", days: item.days.map((day) => ({ id: day.id, dayLabel: day.dayLabel, date: dateValue(day.date), title: day.title, breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner, content: day.content ?? "", accommodation: day.accommodation ?? "", notes: day.notes ?? "" })), inclusions: item.items.filter((entry) => entry.type === "INCLUSION").map((entry) => entry.content), exclusions: item.items.filter((entry) => entry.type === "EXCLUSION").map((entry) => entry.content) }} /></div>;
  }

  const inclusions = item.items.filter((entry) => entry.type === "INCLUSION");
  const exclusions = item.items.filter((entry) => entry.type === "EXCLUSION");
  const guideText = item.guides.length ? item.guides.map((guide) => [guide.name, guide.phone].filter(Boolean).join(" – ")).join("\n") : [item.tourGuideName, item.tourGuidePhone].filter(Boolean).join(" – ") || "—";
  const headerImageUrl = item.headerImageStoredName ? `/api/quick-tour-program-assets/${item.id}/header` : null;
  const footerImageUrl = item.footerImageStoredName ? `/api/quick-tour-program-assets/${item.id}/footer` : null;
  const exportData: QuickTourProgramExportData = {
    title: item.title, durationText: item.durationText, transportText: item.transportText, departureText: item.departureText, programName: item.programName, tourCode: item.tourCode, guestSummary: item.guestSummary,
    startDate: displayDate(item.startDate), endDate: displayDate(item.endDate), groupLeader: [item.groupLeaderName, item.groupLeaderPhone].filter(Boolean).join(" – ") || "—", vehiclePlate: item.vehiclePlate,
    driver: [item.driverName, item.driverPhone].filter(Boolean).join(" – ") || "—", tourGuide: guideText, closingText: item.closingText,
    headerImageUrl, headerContent: item.headerContent, footerImageUrl, footerContent: item.footerContent,
    days: item.days.map((day) => ({ dayLabel: day.dayLabel, date: displayDate(day.date), title: day.title, meals: meals(day), content: day.content, accommodation: day.accommodation, notes: day.notes })),
    inclusions: inclusions.map((entry) => entry.content), exclusions: exclusions.map((entry) => entry.content),
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={item.sourceItineraryId ? `/quick/${item.sourceItineraryId}` : "/quick/tour-programs"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />{item.sourceItineraryId ? "Quay lại lịch trình" : "Danh sách chương trình Tour"}</Link><div className="flex flex-wrap gap-2"><QuickTourProgramExportActions targetId="quick-tour-program-a4" data={exportData} />{canEdit && item.sourceItineraryId && <WorkCaseActionForm action={regenerateQuickTourProgramFromItinerary.bind(null, item.id)}><Button type="submit" variant="outline"><RefreshCw />Gen lại từ lịch trình</Button></WorkCaseActionForm>}{canEdit && <Button nativeButton={false} render={<Link href={`/quick/tour-programs/${item.id}?edit=1`} />}><Pencil />Sửa</Button>}{canEdit && <WorkCaseActionForm action={deleteQuickTourProgram.bind(null, item.id)}><Button type="submit" variant="destructive"><Trash2 />Xóa</Button></WorkCaseActionForm>}</div></div>
    <p className="text-xs text-muted-foreground">Tạo bởi {item.createdByName} lúc {item.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })} · Sửa bởi {item.updatedByName} lúc {item.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}</p>
    <div className="overflow-x-auto pb-4">
      <article id="quick-tour-program-a4" className="mx-auto min-h-[297mm] w-[210mm] max-w-none space-y-7 bg-white px-[16mm] py-[15mm] font-sans text-[11pt] leading-[1.45] text-black shadow-lg">
        {(headerImageUrl || item.headerContent) && <header className="border-b pb-4 text-center">{headerImageUrl && <img src={headerImageUrl} alt={item.headerImageAlt || "Header"} className="mx-auto max-h-[32mm] max-w-full object-contain" />}{item.headerContent && <div className="mt-2 whitespace-pre-wrap text-[9pt]">{item.headerContent}</div>}</header>}
        <header className="space-y-2 text-center"><h1 className="text-[18pt] font-bold uppercase">{item.title}</h1><p>Thời gian: {item.durationText || "—"} · Phương tiện: {item.transportText || "—"} · Khởi hành: {item.departureText || "—"}</p></header>
        <section className="space-y-2"><h2 className="border-b pb-1 text-[12pt] font-bold">THÔNG TIN CHUNG (TOUR OVERVIEW)</h2><div className="grid grid-cols-[42mm_1fr] gap-x-3 gap-y-1"><strong>Tên chương trình:</strong><span>{item.programName}</span><strong>Mã Tour:</strong><span>{item.tourCode || "—"}</span><strong>Số lượng khách:</strong><span>{item.guestSummary || "—"}</span><strong>Ngày khởi hành:</strong><span>{displayDate(item.startDate)}</span><strong>Ngày kết thúc:</strong><span>{displayDate(item.endDate)}</span><strong>Trưởng đoàn:</strong><span>{[item.groupLeaderName, item.groupLeaderPhone].filter(Boolean).join(" – ") || "—"}</span><strong>Biển số xe:</strong><span>{item.vehiclePlate || "—"}</span><strong>Lái xe:</strong><span>{[item.driverName, item.driverPhone].filter(Boolean).join(" – ") || "—"}</span><strong>Hướng dẫn viên:</strong><span className="whitespace-pre-line">{guideText}</span></div></section>
        <section className="space-y-3"><h2 className="text-[12pt] font-bold uppercase">Chương trình Tour</h2><table className="w-full table-fixed border-collapse"><thead><tr className="bg-amber-100"><th className="w-[28%] border border-black p-2 text-left">Ngày</th><th className="border border-black p-2 text-left">Lịch trình</th><th className="w-[18%] border border-black p-2 text-left">Bữa ăn</th></tr></thead><tbody>{item.days.map((day) => <tr key={day.id}><td className="border border-black p-2">{day.dayLabel}{day.date ? ` (${displayDate(day.date)})` : ""}</td><td className="border border-black p-2 font-semibold">{day.title}</td><td className="border border-black p-2">{meals(day)}</td></tr>)}</tbody></table></section>
        <section className="space-y-6">{item.days.map((day) => <article key={day.id} className="break-inside-avoid space-y-2"><h3 className="text-[11pt] font-bold uppercase">{day.dayLabel}{day.date ? ` (${displayDate(day.date)})` : ""}: {day.title} ({meals(day)})</h3>{day.content && <div className="whitespace-pre-wrap text-justify">{day.content}</div>}{day.accommodation && <p className="font-semibold">Nghỉ đêm: {day.accommodation}</p>}{day.notes && <p className="italic text-red-600">Lưu ý: {day.notes}</p>}</article>)}</section>
        <section className="grid grid-cols-2 gap-8"><div><h2 className="mb-2 font-bold uppercase">Bao gồm trong Tour</h2><ul className="list-disc space-y-1 pl-5">{inclusions.map((entry) => <li key={entry.id}>{entry.content}</li>)}</ul></div><div><h2 className="mb-2 font-bold uppercase">Không bao gồm</h2><ul className="list-disc space-y-1 pl-5">{exclusions.map((entry) => <li key={entry.id}>{entry.content}</li>)}</ul></div></section>
        {item.closingText && <p className="pt-4 text-center font-semibold italic">{item.closingText}</p>}
        {(footerImageUrl || item.footerContent) && <footer className="mt-auto border-t pt-4 text-center">{item.footerContent && <div className="mb-2 whitespace-pre-wrap text-[9pt]">{item.footerContent}</div>}{footerImageUrl && <img src={footerImageUrl} alt={item.footerImageAlt || "Footer"} className="mx-auto max-h-[28mm] max-w-full object-contain" />}</footer>}
      </article>
    </div>
  </div>;
}
