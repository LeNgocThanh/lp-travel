import Link from "next/link";
import { Pencil, RefreshCw } from "lucide-react";
import { regenerateQuickItineraryLayout } from "@/app/actions/document-layouts";
import { ItineraryExportActions, type ItineraryExportDoc } from "@/components/itinerary-export-actions";
import { ItineraryInformation } from "@/components/itinerary-information";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

type Day = ItineraryExportDoc["days"][number];

function displayDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function meals(day: Day) {
  return [[day.breakfast, "B"], [day.lunch, "L"], [day.dinner, "D"]].map(([selected, label]) => selected ? label : "-").join("/");
}

export function LeadItineraryDetail({ id, title, canEdit, itinerary }: { id: string; title: string; canEdit: boolean; itinerary: ItineraryExportDoc }) {
  return <Card>
    <CardHeader className="flex-row items-center justify-between gap-3">
      <CardTitle>Lịch trình: {title}</CardTitle>
      {canEdit && <div className="flex gap-2"><WorkCaseActionForm action={regenerateQuickItineraryLayout.bind(null, id)}><Button type="submit" variant="outline"><RefreshCw />Gen theo mẫu mới</Button></WorkCaseActionForm><Button nativeButton={false} render={<Link href={`/quick/${id}?edit=1`} />} variant="outline"><Pencil />Sửa lịch trình</Button></div>}
    </CardHeader>
    <CardContent className="space-y-5">
      <ItineraryExportActions targetId="lead-itinerary-document" fileName={`lead-${title}`} itinerary={itinerary} />
      <div id="lead-itinerary-document" className="space-y-5 bg-white p-4 text-slate-900">
        <h2 className="font-bold">{title}</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-sm"><tbody>{itinerary.days.map((day) => <tr key={day.dayNumber}><td className="border p-2 font-semibold">Ngày {day.dayNumber} ({displayDate(day.date)})</td><td className="border p-2 font-semibold">{day.title}</td><td className="border p-2">{day.transport || "—"}</td><td className="border p-2">({meals(day)})</td></tr>)}</tbody></table></div>
        <div className="space-y-5">{itinerary.days.map((day, index) => <section key={day.dayNumber} className="space-y-1 text-sm"><h3 className="font-bold">Ngày {day.dayNumber}: {day.title}</h3>{day.accommodation && <p><b>Nơi lưu trú:</b> {day.accommodation}</p>}{day.activityLocation && <p><b>Địa điểm:</b> {day.activityLocation}</p>}{day.flight && index < itinerary.days.length - 1 && <p className="font-bold text-black">Flight: {day.flight}</p>}{day.description && <p className="whitespace-pre-wrap">{day.description}</p>}{day.flight && index === itinerary.days.length - 1 && <p className="font-bold text-black">Flight: {day.flight}</p>}{day.overnight && day.overnightLocation && <p className="font-bold">Overnight in {day.overnightLocation}</p>}{day.notes && <p className="whitespace-pre-wrap italic text-red-600">Note: {day.notes}</p>}</section>)}</div><p className="pt-12 text-center font-bold text-black">End of services!</p><ItineraryInformation inclusions={itinerary.inclusions} exclusions={itinerary.exclusions} informationNotes={itinerary.informationNotes} />
      </div>
    </CardContent>
  </Card>;
}
