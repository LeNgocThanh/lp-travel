"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

type SourceDay = {
  id: string;
  productName: string;
  dayNumber: number;
  title: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};
type TemplateOption = { id: string; name: string; code: string; isDefault: boolean };

type Row = { id: number; date: string; sourceId: string; transport: string; flight: string; breakfast: boolean; lunch: boolean; dinner: boolean; tourGuide: boolean; overnight: boolean; overnightLocation: string };

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function followingDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function WorkCaseItineraryGenerator({ action, sources, headers, footers }: { action: (formData: FormData) => void | Promise<void>; sources: SourceDay[]; headers: TemplateOption[]; footers: TemplateOption[] }) {
  const [nextId, setNextId] = useState(2);
  const [rows, setRows] = useState<Row[]>([{ id: 1, date: "", sourceId: "", transport: "Private Car", flight: "", breakfast: false, lunch: false, dinner: false, tourGuide: false, overnight: false, overnightLocation: "" }]);

  const addRow = () => {
    setRows((current) => [...current, { id: nextId, date: followingDate(current.at(-1)?.date ?? ""), sourceId: "", transport: "Private Car", flight: "", breakfast: false, lunch: false, dinner: false, tourGuide: false, overnight: false, overnightLocation: "" }]);
    setNextId((value) => value + 1);
  };

  const updateRow = (id: number, values: Partial<Row>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row));
  const toggleTransport = (row: Row, value: string, checked: boolean) => { const values = row.transport.split(",").map((item) => item.trim()).filter(Boolean).filter((item) => item !== value); updateRow(row.id, { transport: checked ? [...values, value].join(", ") : values.join(", ") }); };

  return (
    <WorkCaseActionForm action={action} className="space-y-5">
      <input type="hidden" name="rowCount" value={rows.length} />
      <div className="space-y-1.5">
        <Label htmlFor="itinerary-title">Tên tài liệu</Label>
        <Input id="itinerary-title" name="title" defaultValue="ITINERARY" required maxLength={150} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">Mẫu Header<select name="headerTemplateId" defaultValue={headers.find((template) => template.isDefault)?.id ?? ""} className={selectClass}><option value="">Không dùng Header</option>{headers.map((template) => <option key={template.id} value={template.id}>{template.name} ({template.code})</option>)}</select></label>
        <label className="space-y-1.5 text-sm font-medium">Mẫu Footer<select name="footerTemplateId" defaultValue={footers.find((template) => template.isDefault)?.id ?? ""} className={selectClass}><option value="">Không dùng Footer</option>{footers.map((template) => <option key={template.id} value={template.id}>{template.name} ({template.code})</option>)}</select></label>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Day {index + 1}</h2>
              {rows.length > 1 && <Button type="button" variant="ghost" size="icon-sm" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label={`Xóa ngày ${index + 1}`}><Trash2 /></Button>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Ngày
                <Input name={`date_${index}`} type="date" value={row.date} onChange={(event) => updateRow(row.id, { date: event.target.value })} required />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Chọn lịch trình trong tour
                <select
                  name={`sourceItineraryDayId_${index}`}
                  value={row.sourceId}
                  onChange={(event) => {
                    const source = sources.find((item) => item.id === event.target.value);
                    updateRow(row.id, { sourceId: event.target.value, breakfast: source?.breakfast ?? false, lunch: source?.lunch ?? false, dinner: source?.dinner ?? false });
                  }}
                  className={selectClass}
                  required
                >
                  <option value="">Chọn nội dung lịch trình</option>
                  {sources.map((source) => <option key={source.id} value={source.id}>{source.productName} · Ngày {source.dayNumber}: {source.title || "Chưa có tiêu đề"}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Phương tiện
                <span className="flex flex-wrap gap-4 rounded-md border px-3 py-2"><span className="flex items-center gap-2"><input type="checkbox" checked={row.transport.split(",").map((item) => item.trim()).includes("Private Car")} onChange={(event) => toggleTransport(row, "Private Car", event.target.checked)} />Private Car</span><span className="flex items-center gap-2"><input type="checkbox" checked={row.transport.split(",").map((item) => item.trim()).includes("ESG")} onChange={(event) => toggleTransport(row, "ESG", event.target.checked)} />ESG</span></span>
                <Input name={`transport_${index}`} value={row.transport} onChange={(event) => updateRow(row.id, { transport: event.target.value })} maxLength={200} />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">Flight<Input name={`flight_${index}`} value={row.flight} onChange={(event) => updateRow(row.id, { flight: event.target.value })} maxLength={500} placeholder="Ví dụ: VN123 HAN – SGN 08:00 – 10:10" /></label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700"><input name={`tourGuide_${index}`} type="checkbox" checked={row.tourGuide} onChange={(event) => updateRow(row.id, { tourGuide: event.target.checked })} />Hướng dẫn viên</label>
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Bữa ăn</span>
                <div className="flex h-9 items-center gap-5 rounded-md border px-3 text-sm">
                  {([['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2"><input name={`${key}_${index}`} type="checkbox" checked={row[key]} onChange={(event) => updateRow(row.id, { [key]: event.target.checked })} />{label}</label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2"><label className="flex items-center gap-2 text-sm font-medium"><input name={`overnight_${index}`} type="checkbox" checked={row.overnight} onChange={(event) => updateRow(row.id, { overnight: event.target.checked })} />Overnight</label>{row.overnight && <label className="block space-y-1.5 text-sm font-medium">Địa điểm nghỉ đêm<Input name={`overnightLocation_${index}`} value={row.overnightLocation} onChange={(event) => updateRow(row.id, { overnightLocation: event.target.value })} maxLength={200} required /></label>}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button type="button" variant="outline" onClick={addRow}><Plus />Thêm ngày</Button>
        <Button type="submit">Tạo nội dung lịch trình</Button>
      </div>
    </WorkCaseActionForm>
  );
}
