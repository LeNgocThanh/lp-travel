"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { QuickTourProgramState } from "@/app/actions/quick-tour-programs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Day = { id: string; dayLabel: string; date: string; title: string; breakfast: boolean; lunch: boolean; dinner: boolean; content: string; accommodation: string; notes: string };
type ProgramGuide = { id: string; tourGuideId: string; name: string; phone: string };
type Initial = { sourceItineraryId?: string; title: string; durationText: string; transportText: string; departureText: string; programName: string; tourCode: string; guestSummary: string; startDate: string; endDate: string; groupLeaderName: string; groupLeaderPhone: string; vehiclePlate: string; driverName: string; driverPhone: string; tourGuideName: string; tourGuidePhone: string; guides?: ProgramGuide[]; closingText: string; headerTemplateId: string; footerTemplateId: string; days: Day[]; inclusions: string[]; exclusions: string[] };
type Template = { id: string; name: string; type: string; isDefault: boolean };
type TourGuideOption = { id: string; fullName: string; phone: string };
const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
const blankDay = (id: string, date = "", dayLabel = "Ngày 1"): Day => ({ id, dayLabel, date, title: "", breakfast: false, lunch: false, dinner: false, content: "", accommodation: "", notes: "" });
const nextDate = (value: string) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function QuickTourProgramForm({ action, templates, tourGuides = [], initial }: { action: (state: QuickTourProgramState, formData: FormData) => Promise<QuickTourProgramState>; templates: Template[]; tourGuides?: TourGuideOption[]; initial?: Initial }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [days, setDays] = useState(initial?.days.length ? initial.days : [blankDay("new-0")]);
  const [inclusions, setInclusions] = useState(initial?.inclusions ?? [""]);
  const [exclusions, setExclusions] = useState(initial?.exclusions ?? [""]);
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [programGuides, setProgramGuides] = useState<ProgramGuide[]>(initial?.guides?.length ? initial.guides : initial?.tourGuideName ? [{ id: "legacy-guide", tourGuideId: "", name: initial.tourGuideName, phone: initial.tourGuidePhone }] : []);
  const [dateError, setDateError] = useState("");
  const updateDay = (id: string, value: Partial<Day>) => setDays((current) => current.map((day) => day.id === id ? { ...day, ...value } : day));
  const orderWarnings = useMemo(() => days.flatMap((day, index) => {
    const followingDay = days[index + 1];
    return followingDay?.date && day.date && day.date > followingDay.date ? [`Ngày ở dòng ${index + 1} lớn hơn ngày ở dòng ${index + 2}.`] : [];
  }), [days]);
  const generateDays = () => {
    setDateError("");
    if (!startDate || !endDate) {
      setDateError("Vui lòng nhập Ngày khởi hành và Ngày kết thúc trước khi sinh các ngày.");
      return;
    }
    if (startDate > endDate) {
      setDateError("Ngày kết thúc không được nhỏ hơn Ngày khởi hành.");
      return;
    }
    const generated: Day[] = [];
    let date = startDate;
    while (date <= endDate && generated.length < 100) {
      generated.push(blankDay(`generated-${Date.now()}-${generated.length}`, date, `Ngày ${generated.length + 1}`));
      date = nextDate(date);
    }
    if (date <= endDate) {
      setDateError("Khoảng thời gian vượt quá giới hạn 100 ngày.");
      return;
    }
    const hasEnteredContent = days.some((day) => day.title || day.content || day.accommodation || day.notes);
    if (hasEnteredContent && !window.confirm("Sinh lại các ngày sẽ thay thế nội dung các dòng chương trình hiện tại. Bạn có muốn tiếp tục?")) return;
    setDays(generated);
  };
  const insertDayAfter = (index: number) => setDays((current) => {
    const updated = [...current];
    const currentDay = updated[index];
    updated.splice(index + 1, 0, blankDay(`new-${Date.now()}`, nextDate(currentDay.date), `Ngày ${index + 2}`));
    return updated;
  });
  const updateProgramGuide = (id: string, value: Partial<ProgramGuide>) => setProgramGuides((current) => current.map((guide) => guide.id === id ? { ...guide, ...value } : guide));
  const selectTourGuide = (rowId: string, id: string) => {
    const guide = tourGuides.find((item) => item.id === id);
    if (!guide) { updateProgramGuide(rowId, { tourGuideId: "" }); return; }
    updateProgramGuide(rowId, { tourGuideId: guide.id, name: guide.fullName, phone: guide.phone });
  };

  return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => formAction(data)); }} className="space-y-5">
    {state?.error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
    {dateError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{dateError}</p>}
    {orderWarnings.length > 0 && <div role="alert" className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800">{orderWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
    <input type="hidden" name="rowCount" value={days.length} />
    <input type="hidden" name="guideCount" value={programGuides.length} />
    <input type="hidden" name="sourceItineraryId" value={initial?.sourceItineraryId ?? ""} />
    <input type="hidden" name="inclusionCount" value={inclusions.length} />
    <input type="hidden" name="exclusionCount" value={exclusions.length} />
    <fieldset disabled={pending} className="contents">
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium md:col-span-2">Tiêu đề lớn<Input name="title" defaultValue={initial?.title ?? ""} required /></label>
        <label className="space-y-1 text-sm font-medium">Thời gian<Input name="durationText" defaultValue={initial?.durationText ?? ""} placeholder="3 ngày 3 đêm" /></label>
        <label className="space-y-1 text-sm font-medium">Phương tiện<Input name="transportText" defaultValue={initial?.transportText ?? ""} /></label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Khởi hành<Input name="departureText" defaultValue={initial?.departureText ?? ""} placeholder="Đêm 27/05/2026" /></label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Tên chương trình<Input name="programName" defaultValue={initial?.programName ?? ""} required /></label>
        <label className="space-y-1 text-sm font-medium">Mã Tour<Input name="tourCode" defaultValue={initial?.tourCode ?? ""} /></label>
        <label className="space-y-1 text-sm font-medium">Số lượng khách<Input name="guestSummary" defaultValue={initial?.guestSummary ?? ""} /></label>
        <label className="space-y-1 text-sm font-medium">Ngày khởi hành<Input name="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label className="space-y-1 text-sm font-medium">Ngày kết thúc<Input name="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <div className="md:col-span-2"><Button type="button" variant="outline" onClick={generateDays}>Sinh các ngày từ khoảng ngày</Button></div>
        <label className="space-y-1 text-sm font-medium">Trưởng đoàn<Input name="groupLeaderName" defaultValue={initial?.groupLeaderName ?? ""} /></label>
        <label className="space-y-1 text-sm font-medium">SĐT trưởng đoàn<Input name="groupLeaderPhone" defaultValue={initial?.groupLeaderPhone ?? ""} /></label>
        <label className="space-y-1 text-sm font-medium">Biển số xe<Input name="vehiclePlate" defaultValue={initial?.vehiclePlate ?? ""} /></label><div />
        <label className="space-y-1 text-sm font-medium">Lái xe<Input name="driverName" defaultValue={initial?.driverName ?? ""} /></label>
        <label className="space-y-1 text-sm font-medium">SĐT lái xe<Input name="driverPhone" defaultValue={initial?.driverPhone ?? ""} /></label>
        <div className="space-y-3 md:col-span-2"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Hướng dẫn viên</h2><Button type="button" variant="outline" size="sm" onClick={() => setProgramGuides((current) => [...current, { id: `guide-${Date.now()}`, tourGuideId: "", name: "", phone: "" }])}><Plus />Thêm HDV</Button></div>{programGuides.map((guide, index) => <div key={guide.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-2"><label className="space-y-1 text-sm font-medium md:col-span-2">Chọn từ dữ liệu hướng dẫn viên<select name={`guideId_${index}`} className={selectClass} value={guide.tourGuideId} onChange={(event) => selectTourGuide(guide.id, event.target.value)}><option value="">Nhập tay</option>{tourGuides.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.phone}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Tên hướng dẫn viên<Input name={`guideName_${index}`} value={guide.name} onChange={(event) => updateProgramGuide(guide.id, { name: event.target.value })} required /></label><div className="flex items-end gap-2"><label className="flex-1 space-y-1 text-sm font-medium">Số điện thoại<Input name={`guidePhone_${index}`} value={guide.phone} onChange={(event) => updateProgramGuide(guide.id, { phone: event.target.value })} /></label><Button type="button" variant="ghost" size="icon-sm" onClick={() => setProgramGuides((current) => current.filter((item) => item.id !== guide.id))}><Trash2 /></Button></div></div>)}</div>
        <label className="space-y-1 text-sm font-medium">Header<select name="headerTemplateId" defaultValue={initial?.headerTemplateId || templates.find((item) => item.type === "HEADER" && item.isDefault)?.id || ""} className={selectClass}><option value="">Không dùng</option>{templates.filter((item) => item.type === "HEADER").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="space-y-1 text-sm font-medium">Footer<select name="footerTemplateId" defaultValue={initial?.footerTemplateId || templates.find((item) => item.type === "FOOTER" && item.isDefault)?.id || ""} className={selectClass}><option value="">Không dùng</option>{templates.filter((item) => item.type === "FOOTER").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </Card>
      {days.map((day, index) => <Card key={day.id} className="grid gap-3 p-5 md:grid-cols-2">
        <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2"><h2 className="font-semibold">Dòng chương trình {index + 1}</h2><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => insertDayAfter(index)}><Plus />Thêm ngày phía dưới</Button>{days.length > 1 && <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDays((current) => current.filter((item) => item.id !== day.id))}><Trash2 /></Button>}</div></div>
        <label className="space-y-1 text-sm font-medium">Nhãn ngày<Input name={`dayLabel_${index}`} value={day.dayLabel} onChange={(event) => updateDay(day.id, { dayLabel: event.target.value })} required /></label>
        <label className="space-y-1 text-sm font-medium">Ngày<Input name={`dayDate_${index}`} type="date" value={day.date} onChange={(event) => updateDay(day.id, { date: event.target.value })} /></label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Tên lịch trình<Input name={`dayTitle_${index}`} value={day.title} onChange={(event) => updateDay(day.id, { title: event.target.value })} required /></label>
        <div className="flex gap-5 md:col-span-2">{([['breakfast','Sáng'],['lunch','Trưa'],['dinner','Tối']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input name={`${key}_${index}`} type="checkbox" checked={day[key]} onChange={(event) => updateDay(day.id, { [key]: event.target.checked })} />{label}</label>)}</div>
        <label className="space-y-1 text-sm font-medium md:col-span-2">Nội dung chi tiết<Textarea name={`dayContent_${index}`} value={day.content} onChange={(event) => updateDay(day.id, { content: event.target.value })} rows={10} /></label>
        <label className="space-y-1 text-sm font-medium">Lưu trú<Input name={`accommodation_${index}`} value={day.accommodation} onChange={(event) => updateDay(day.id, { accommodation: event.target.value })} /></label>
        <label className="space-y-1 text-sm font-medium">Ghi chú<Input name={`dayNotes_${index}`} value={day.notes} onChange={(event) => updateDay(day.id, { notes: event.target.value })} /></label>
      </Card>)}
      <Button type="button" variant="outline" onClick={() => setDays((current) => [...current, blankDay(`new-${Date.now()}`, nextDate(current.at(-1)?.date ?? ""), `Ngày ${current.length + 1}`)])}><Plus />Thêm ngày</Button>
      <Card className="grid gap-5 p-5 md:grid-cols-2"><ListEditor title="Bao gồm trong tour" prefix="inclusion" values={inclusions} setValues={setInclusions} /><ListEditor title="Không bao gồm" prefix="exclusion" values={exclusions} setValues={setExclusions} /><label className="space-y-1 text-sm font-medium md:col-span-2">Câu kết<Textarea name="closingText" defaultValue={initial?.closingText ?? "Hẹn gặp lại Quý khách trong những chuyến hành trình tiếp theo."} rows={3} /></label></Card>
      <div className="flex justify-end"><Button type="submit">{pending ? "Đang lưu..." : "Lưu và xem chương trình"}</Button></div>
    </fieldset>
  </form>;
}

function ListEditor({ title, prefix, values, setValues }: { title: string; prefix: string; values: string[]; setValues: React.Dispatch<React.SetStateAction<string[]>> }) { return <div className="space-y-3"><h2 className="font-semibold">{title}</h2>{values.map((value, index) => <div key={index} className="flex gap-2"><Input name={`${prefix}_${index}`} value={value} onChange={(event) => setValues((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><Button type="button" variant="ghost" size="icon-sm" onClick={() => setValues((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></Button></div>)}<Button type="button" variant="outline" size="sm" onClick={() => setValues((current) => [...current, ""])}><Plus />Thêm dòng</Button></div>; }
