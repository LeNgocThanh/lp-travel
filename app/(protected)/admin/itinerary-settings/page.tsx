import { saveItineraryInformationSetting } from "@/app/actions/itinerary-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ItinerarySettingsPage() {
  await requireAdmin();
  const item = await prisma.itineraryInformationSetting.findUnique({ where: { id: "default" } });
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">Itinerary Information</h1><p className="text-sm text-muted-foreground">Nội dung mặc định được chụp lại khi tạo lịch trình mới từ Lead. Nhập mỗi ý trên một dòng để sinh danh sách bullet.</p></div><Card><CardHeader><CardTitle>II. Quotation &amp; Information</CardTitle><CardDescription>Cấu hình Inclusions, Exclusions và NOTES dùng cho lịch trình Lead.</CardDescription></CardHeader><CardContent><WorkCaseActionForm action={saveItineraryInformationSetting} className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-2"><Label htmlFor="itinerary-inclusions">Inclusions</Label><Textarea id="itinerary-inclusions" name="inclusions" rows={14} defaultValue={item?.inclusions ?? ""} placeholder="Mỗi nội dung trên một dòng" /></div><div className="space-y-2"><Label htmlFor="itinerary-exclusions">Exclusions</Label><Textarea id="itinerary-exclusions" name="exclusions" rows={14} defaultValue={item?.exclusions ?? ""} placeholder="Mỗi nội dung trên một dòng" /></div></div><div className="space-y-2"><Label htmlFor="itinerary-notes">NOTES</Label><Textarea id="itinerary-notes" name="notes" rows={10} defaultValue={item?.notes ?? ""} placeholder="Mỗi ghi chú trên một dòng" /></div><Button type="submit">Lưu cấu hình lịch trình</Button></WorkCaseActionForm></CardContent></Card></div>;
}
