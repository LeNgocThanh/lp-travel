import type { ProductItineraryDay } from "@prisma/client";
import { MetadataFields } from "@/components/metadata-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

export function ProductItineraryDayForm({ action, item }: { action: (formData: FormData) => void | Promise<void>; item?: ProductItineraryDay }) {
  return <WorkCaseActionForm action={action} className="grid gap-3 md:grid-cols-2">
    <div><Label>Ngày thứ</Label><Input name="dayNumber" type="number" min={1} max={365} defaultValue={item?.dayNumber} required /></div>
    <div><Label>Tiêu đề ngày</Label><Input name="title" maxLength={150} defaultValue={item?.title ?? ""} placeholder="Ví dụ: Hà Nội – Hạ Long" /></div>
    <div><Label>Địa điểm bắt đầu</Label><Input name="startLocation" maxLength={200} defaultValue={item?.startLocation ?? ""} /></div>
    <div><Label>Địa điểm kết thúc</Label><Input name="endLocation" maxLength={200} defaultValue={item?.endLocation ?? ""} /></div>
    <div className="md:col-span-2"><Label>Địa điểm diễn ra hoạt động</Label><Input name="activityLocation" maxLength={500} defaultValue={item?.activityLocation ?? ""} placeholder="Ví dụ: Vịnh Hạ Long, Hang Sửng Sốt, đảo Ti Tốp" /></div>
    <div className="md:col-span-2"><Label>Nơi lưu trú</Label><Input name="accommodation" maxLength={300} defaultValue={item?.accommodation ?? ""} placeholder="Tên khách sạn hoặc hình thức lưu trú" /></div>
    <div className="md:col-span-2"><Label>Flight</Label><Input name="flight" maxLength={500} defaultValue={item?.flight ?? ""} placeholder="Ví dụ: VN123 HAN – SGN 08:00 – 10:10" /></div>
    <fieldset className="md:col-span-2"><legend className="mb-2 text-sm font-medium">Bữa ăn</legend><div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="breakfast" defaultChecked={item?.breakfast} /> Bữa sáng</label><label className="flex items-center gap-2"><input type="checkbox" name="lunch" defaultChecked={item?.lunch} /> Bữa trưa</label><label className="flex items-center gap-2"><input type="checkbox" name="dinner" defaultChecked={item?.dinner} /> Bữa tối</label></div></fieldset>
    <div className="md:col-span-2"><Label>Nội dung lịch trình</Label><Textarea name="description" maxLength={5000} defaultValue={item?.description ?? ""} className="min-h-28" /></div>
    <div className="md:col-span-2"><Label>Ghi chú</Label><Textarea name="notes" maxLength={2000} defaultValue={item?.notes ?? ""} /></div>
    <MetadataFields metadata={item?.metadata} prefix={`itinerary-${item?.id ?? "new"}`} />
    <Button type="submit" className="justify-self-start">{item ? "Lưu ngày" : "Thêm ngày"}</Button>
  </WorkCaseActionForm>;
}
