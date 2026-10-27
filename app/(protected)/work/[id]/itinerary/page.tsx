import Link from "next/link";
import { ArrowLeft, Pencil, Plus, RefreshCw } from "lucide-react";
import { notFound } from "next/navigation";
import { addWorkCaseItineraryDay, generateWorkCaseItinerary, saveWorkCaseItineraryDraft } from "@/app/actions/work-case-itineraries";
import { regenerateWorkCaseItineraryLayout } from "@/app/actions/document-layouts";
import { FormDialog } from "@/components/form-dialog";
import { WorkCaseItineraryGenerator } from "@/components/work-case-itinerary-generator";
import { ItineraryExportActions } from "@/components/itinerary-export-actions";
import { ItineraryInformation } from "@/components/itinerary-information";
import { OvernightFields } from "@/components/overnight-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workCaseScope } from "@/lib/work-case-access";

const inputClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("weekday")},${value("day")} ${value("month")} ${value("year")}`;
};
const meals = (breakfast: boolean, lunch: boolean, dinner: boolean) => `(${breakfast ? "B" : "-"}/${lunch ? "L" : "-"}/${dinner ? "D" : "-"})`;
const mealNames = (breakfast: boolean, lunch: boolean, dinner: boolean) => [[breakfast, "Breakfast"], [lunch, "Lunch"], [dinner, "Dinner"]].filter(([selected]) => selected).map(([, label]) => label).join(", ");

export default async function WorkCaseItineraryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { edit } = await searchParams;
  const item = await prisma.workCase.findFirst({
    where: { id, ...(await workCaseScope(user)) },
    include: {
      items: { include: { product: { include: { itineraryDays: { orderBy: { dayNumber: "asc" } } } } } },
      itinerary: { include: { days: { orderBy: { dayNumber: "asc" } } } },
    },
  });
  if (!item) notFound();

  const selectedTemplateIds = [item.itinerary?.headerTemplateId, item.itinerary?.footerTemplateId].filter((value): value is string => Boolean(value));
  const templates = await prisma.documentTemplate.findMany({
    where: { type: { in: ["HEADER", "FOOTER"] }, OR: [{ active: true }, { id: { in: selectedTemplateIds } }] },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  const headers = templates.filter((template) => template.type === "HEADER");
  const footers = templates.filter((template) => template.type === "FOOTER");

  const sources = item.items.flatMap((line) => line.product?.itineraryDays.map((day) => ({
    id: day.id,
    productName: line.product!.name,
    dayNumber: day.dayNumber,
    title: day.title,
    breakfast: day.breakfast,
    lunch: day.lunch,
    dinner: day.dinner,
  })) ?? []);
  const editable = !["COMPLETED", "CANCELLED"].includes(item.status);
  const lastItineraryDate = item.itinerary?.days.at(-1)?.date;
  const nextItineraryDate = lastItineraryDate ? new Date(lastItineraryDate.getTime() + 86400000).toISOString().slice(0, 10) : "";
  const templateValues: Record<string, string> = {
    companyName: "LA PASSION TRAVEL",
    workCaseCode: item.code,
    workCaseTitle: item.title,
    customerName: item.customerNameSnapshot,
    updatedAt: item.itinerary?.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "",
  };
  const renderTemplate = (content: string) => content.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, key: string) => templateValues[key] ?? match);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/work/${item.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900"><ArrowLeft className="size-4" />{item.code}</Link>
        {item.itinerary && edit !== "1" && editable && <div className="flex gap-2"><WorkCaseActionForm action={regenerateWorkCaseItineraryLayout.bind(null, item.id)}><Button type="submit" variant="outline"><RefreshCw />Gen theo mẫu mới</Button></WorkCaseActionForm><Button nativeButton={false} render={<Link href={`/work/${item.id}/itinerary?edit=1`} />}><Pencil />Chỉnh sửa bản nháp</Button></div>}
      </div>

      {!item.itinerary ? (
        <Card className="p-5 sm:p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Tạo lịch trình cho hồ sơ</h1>
            <p className="text-sm text-muted-foreground">Chọn nội dung từ lịch trình tour. Hệ thống sẽ sao chép đầy đủ thông tin để bạn tiếp tục chỉnh sửa.</p>
          </div>
          {sources.length ? <WorkCaseItineraryGenerator action={generateWorkCaseItinerary.bind(null, item.id)} sources={sources} headers={headers.filter((template) => template.active)} footers={footers.filter((template) => template.active)} /> : <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Các tour/dịch vụ trong hồ sơ chưa có lịch trình mẫu. Hãy bổ sung lịch trình trong dữ liệu sản phẩm trước.</p>}
        </Card>
      ) : edit === "1" && editable ? (<>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
          <div><h1 className="font-semibold">Chỉnh sửa bản nháp</h1><p className="text-xs text-muted-foreground">Hãy lưu các thay đổi đang nhập trước khi thêm ngày mới.</p></div>
          <FormDialog key={`add-day-${item.itinerary.days.length}`} title="Thêm ngày từ lịch trình mẫu" description={`Ngày tiếp theo: Day ${item.itinerary.days.length + 1}`} version={`${item.itinerary.updatedAt.getTime()}:${item.itinerary.days.length}`} triggerLabel="Thêm ngày" triggerIcon={<Plus />}>
            <WorkCaseActionForm action={addWorkCaseItineraryDay.bind(null, item.id)} className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium">Ngày<Input name="date" type="date" defaultValue={nextItineraryDate} required /></label>
              <label className="block space-y-1.5 text-sm font-medium">Lịch trình mẫu<select name="sourceItineraryDayId" className={inputClass} required><option value="">Chọn nội dung lịch trình</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.productName} · Ngày {source.dayNumber}: {source.title || "Chưa có tiêu đề"}</option>)}</select></label>
              <label className="block space-y-1.5 text-sm font-medium">Phương tiện<Input name="transport" defaultValue="Private Car" maxLength={200} /></label>
              <label className="block space-y-1.5 text-sm font-medium">Flight<Input name="flight" maxLength={500} placeholder="Ví dụ: VN123 HAN – SGN 08:00 – 10:10" /></label>
              <label className="flex items-center gap-2 text-sm font-medium"><input name="tourGuide" type="checkbox" />Hướng dẫn viên</label>
              <div className="space-y-1.5"><span className="text-sm font-medium">Bữa ăn</span><div className="flex h-9 items-center gap-5 rounded-md border px-3 text-sm"><label className="flex items-center gap-2"><input name="breakfast" type="checkbox" />Breakfast</label><label className="flex items-center gap-2"><input name="lunch" type="checkbox" />Lunch</label><label className="flex items-center gap-2"><input name="dinner" type="checkbox" />Dinner</label></div></div>
              <OvernightFields checkboxName="overnight" inputName="overnightLocation" />
              <div className="flex justify-end"><Button type="submit">Thêm và gen nội dung</Button></div>
            </WorkCaseActionForm>
          </FormDialog>
        </div>
        <WorkCaseActionForm key={`draft-${item.itinerary.updatedAt.getTime()}-${item.itinerary.days.length}`} action={saveWorkCaseItineraryDraft.bind(null, item.id)} className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="space-y-1.5"><label className="text-sm font-medium">Tên tài liệu</label><Input name="title" defaultValue={item.itinerary.title} required maxLength={150} /></div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">Header và Footer</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><label className="block space-y-1.5 text-sm font-medium">Mẫu Header<select name="headerTemplateId" defaultValue={item.itinerary.headerTemplateId ?? ""} className={inputClass}><option value="">Không dùng Header</option>{headers.map((template) => <option key={template.id} value={template.id}>{template.name}{!template.active ? " (đã lưu trữ)" : ""}</option>)}</select></label><label className="flex items-center gap-2 text-xs text-muted-foreground"><input name="refreshHeader" type="checkbox" />Cập nhật lại snapshot từ mẫu hiện tại</label></div>
              <div className="space-y-2"><label className="block space-y-1.5 text-sm font-medium">Mẫu Footer<select name="footerTemplateId" defaultValue={item.itinerary.footerTemplateId ?? ""} className={inputClass}><option value="">Không dùng Footer</option>{footers.map((template) => <option key={template.id} value={template.id}>{template.name}{!template.active ? " (đã lưu trữ)" : ""}</option>)}</select></label><label className="flex items-center gap-2 text-xs text-muted-foreground"><input name="refreshFooter" type="checkbox" />Cập nhật lại snapshot từ mẫu hiện tại</label></div>
            </div>
          </Card>
          {item.itinerary.days.map((day) => (
            <Card key={day.id} className="p-5 sm:p-6">
              <input type="hidden" name="dayId" value={day.id} />
              <h2 className="text-lg font-semibold">Day {day.dayNumber}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">Lịch trình mẫu<select name={`sourceItineraryDayId_${day.id}`} defaultValue={day.sourceItineraryDayId ?? ""} className={inputClass}><option value="">Không có mẫu</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.productName} · Ngày {source.dayNumber}: {source.title || "Chưa có tiêu đề"}</option>)}</select></label>
                <label className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2"><input name={`regenerate_${day.id}`} type="checkbox" />Gen lại nội dung, địa điểm, lưu trú và ghi chú từ mẫu này khi lưu</label>
                <label className="space-y-1.5 text-sm font-medium">Ngày<Input name={`date_${day.id}`} type="date" defaultValue={dateValue(day.date)} required /></label>
                <label className="space-y-1.5 text-sm font-medium">Tiêu đề<Input name={`dayTitle_${day.id}`} defaultValue={day.title} required maxLength={200} /></label>
                <label className="space-y-1.5 text-sm font-medium">Phương tiện<Input name={`transport_${day.id}`} defaultValue={day.transport ?? ""} maxLength={200} /></label>
                <label className="space-y-1.5 text-sm font-medium">Flight<Input name={`flight_${day.id}`} defaultValue={day.flight ?? ""} maxLength={500} /></label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input name={`tourGuide_${day.id}`} type="checkbox" defaultChecked={day.tourGuide} />Hướng dẫn viên</label>
                <div className="space-y-1.5"><span className="text-sm font-medium">Bữa ăn</span><div className="flex h-9 items-center gap-5 rounded-md border px-3 text-sm">{[["breakfast", "Breakfast", day.breakfast], ["lunch", "Lunch", day.lunch], ["dinner", "Dinner", day.dinner]].map(([name, label, checked]) => <label key={String(name)} className="flex items-center gap-2"><input name={`${name}_${day.id}`} type="checkbox" defaultChecked={Boolean(checked)} />{label}</label>)}</div></div>
                <OvernightFields checkboxName={`overnight_${day.id}`} inputName={`overnightLocation_${day.id}`} defaultChecked={day.overnight} defaultValue={day.overnightLocation ?? ""} />
                <label className="space-y-1.5 text-sm font-medium">Địa điểm bắt đầu<Input name={`startLocation_${day.id}`} defaultValue={day.startLocation ?? ""} maxLength={200} /></label>
                <label className="space-y-1.5 text-sm font-medium">Địa điểm kết thúc<Input name={`endLocation_${day.id}`} defaultValue={day.endLocation ?? ""} maxLength={200} /></label>
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">Địa điểm hoạt động<Input name={`activityLocation_${day.id}`} defaultValue={day.activityLocation ?? ""} maxLength={500} /></label>
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">Lưu trú<Input name={`accommodation_${day.id}`} defaultValue={day.accommodation ?? ""} maxLength={200} /></label>
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">Nội dung<Textarea name={`description_${day.id}`} defaultValue={day.description ?? ""} rows={8} /></label>
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">Ghi chú<Textarea name={`notes_${day.id}`} defaultValue={day.notes ?? ""} rows={3} /></label>
              </div>
            </Card>
          ))}
          <div className="flex justify-end gap-3"><Button nativeButton={false} variant="outline" render={<Link href={`/work/${item.id}/itinerary`} />}>Hủy</Button><Button type="submit">Lưu nháp</Button></div>
        </WorkCaseActionForm>
      </>
      ) : (<>
        <ItineraryExportActions
          targetId="itinerary-document"
          fileName={`${item.code}-${item.itinerary.title}`}
          itinerary={{
            title: item.itinerary.title,
            headerImageUrl: item.itinerary.headerImageStoredName ? `/api/itinerary-assets/${item.itinerary.id}/header` : null,
            headerContent: item.itinerary.headerContent ? renderTemplate(item.itinerary.headerContent) : null,
            footerImageUrl: item.itinerary.footerImageStoredName ? `/api/itinerary-assets/${item.itinerary.id}/footer` : null,
            footerContent: item.itinerary.footerContent ? renderTemplate(item.itinerary.footerContent) : null,
            inclusions: item.itinerary.inclusions,
            exclusions: item.itinerary.exclusions,
            informationNotes: item.itinerary.informationNotes,
            days: item.itinerary.days.map((day) => ({
              dayNumber: day.dayNumber,
              date: dateValue(day.date),
              title: day.title,
              transport: day.transport,
              flight: day.flight,
              tourGuide: day.tourGuide,
              overnight: day.overnight,
              overnightLocation: day.overnightLocation,
              breakfast: day.breakfast,
              lunch: day.lunch,
              dinner: day.dinner,
              accommodation: day.accommodation,
              activityLocation: day.activityLocation,
              startLocation: day.startLocation,
              endLocation: day.endLocation,
              description: day.description,
              notes: day.notes,
            })),
          }}
        />
        <Card id="itinerary-document" className="mx-auto max-w-5xl gap-8 bg-white p-6 sm:p-10 print:border-0 print:shadow-none">
          {(item.itinerary.headerImageStoredName || item.itinerary.headerContent) && <header className="space-y-3 border-b pb-5 text-sm text-slate-700">{item.itinerary.headerImageStoredName && <>{ }<img src={`/api/itinerary-assets/${item.itinerary.id}/header`} alt={item.itinerary.headerImageAlt ?? "Header"} className="max-h-48 w-full object-contain" /></>} {item.itinerary.headerContent && <div className="whitespace-pre-wrap">{renderTemplate(item.itinerary.headerContent)}</div>}</header>}
          <section className="space-y-3">
            <h1 className="inline-block bg-yellow-300 px-1 text-sm font-bold">{item.itinerary.title}</h1>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <tbody>{item.itinerary.days.map((day) => <tr key={day.id} className="font-semibold text-amber-800"><td className="border p-2">Day {day.dayNumber} ({displayDate(day.date)})</td><td className="border p-2">{day.title}</td><td className="border p-2 font-normal text-slate-800"><p>{day.transport || "—"}</p>{day.tourGuide && <p>Tour guide: Yes</p>}</td><td className="border p-2">{meals(day.breakfast, day.lunch, day.dinner)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <section className="space-y-7">
            <h2 className="font-bold">I. Details Itinerary:</h2>
            {item.itinerary.days.map((day, index) => <article key={day.id} className="space-y-1 text-sm text-slate-800"><h3 className="font-bold text-amber-800">Day {day.dayNumber} ({displayDate(day.date)}) {day.title} {meals(day.breakfast, day.lunch, day.dinner)}</h3>{day.accommodation && <p><span className="font-semibold italic">Accommodation:</span> <span className="italic">{day.accommodation}</span></p>}{mealNames(day.breakfast, day.lunch, day.dinner) && <p><span className="font-semibold italic">Meals:</span> {mealNames(day.breakfast, day.lunch, day.dinner)}</p>}{day.activityLocation && <p><span className="font-semibold italic">Activity location:</span> <span className="italic">{day.activityLocation}</span></p>}{day.startLocation && <p><span className="font-semibold italic">Start:</span> {day.startLocation}{day.endLocation && <> · <span className="font-semibold italic">End:</span> {day.endLocation}</>}</p>}{day.transport && <p><span className="font-semibold italic">Transport:</span> {day.transport}</p>}{day.tourGuide && <p><span className="font-semibold italic">Tour guide:</span> Yes</p>}{day.flight && index < item.itinerary!.days.length - 1 && <p className="font-bold text-black">Flight: {day.flight}</p>}{day.description && <p className="whitespace-pre-wrap leading-6">{day.description}</p>}{day.flight && index === item.itinerary!.days.length - 1 && <p className="font-bold text-black">Flight: {day.flight}</p>}{day.overnight && day.overnightLocation && <p className="font-bold text-black">Overnight in {day.overnightLocation}</p>}{day.notes && <p className="whitespace-pre-wrap italic text-red-600"><span className="font-semibold">Note:</span> {day.notes}</p>}</article>)}
            <p className="pt-12 text-center font-bold text-black">End of services!</p>
          </section>
          <ItineraryInformation inclusions={item.itinerary.inclusions} exclusions={item.itinerary.exclusions} informationNotes={item.itinerary.informationNotes} />
          {(item.itinerary.footerImageStoredName || item.itinerary.footerContent) && <footer className="space-y-3 border-t pt-4 text-xs text-slate-500">{item.itinerary.footerImageStoredName && <>{ }<img src={`/api/itinerary-assets/${item.itinerary.id}/footer`} alt={item.itinerary.footerImageAlt ?? "Footer"} className="max-h-40 w-full object-contain" /></>}{item.itinerary.footerContent && <div className="whitespace-pre-wrap">{renderTemplate(item.itinerary.footerContent)}</div>}</footer>}
        </Card>
      </>
      )}
    </div>
  );
}
