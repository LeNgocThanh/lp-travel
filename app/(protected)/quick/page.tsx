import Link from "next/link";
import { Eye, Map } from "lucide-react";
import { createQuickItinerary } from "@/app/actions/quick-itineraries";
import { QuickItineraryForm } from "@/components/quick-itinerary-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function QuickCreatePage() {
  const user = await requireUser();
  const [templates, saved, tourGuides] = await Promise.all([
    prisma.documentTemplate.findMany({ where: { active: true, type: { in: ["HEADER", "FOOTER"] } }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.quickItinerary.findMany({ where: user.role === "ADMIN" ? {} : { createdById: user.id }, orderBy: { updatedAt: "desc" }, take: 20, include: { _count: { select: { days: true } } } }),
    prisma.tourGuide.findMany({ select: { id: true, fullName: true, identityNumber: true }, orderBy: { fullName: "asc" } }),
  ]);
  const options = templates.map(({ id, name, code, type, isDefault, active }) => ({ id, name, code, type, isDefault, active }));
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Tạo nhanh itinerary</h1><p className="text-sm text-muted-foreground">Nhập toàn bộ nội dung bằng tay, không cần hồ sơ việc hoặc lịch trình tour mẫu.</p></div><Button nativeButton={false} variant="outline" render={<Link href="/quick/tour-programs" />}><Map />Chương trình Tour</Button></div>
    <QuickItineraryForm action={createQuickItinerary} headers={options.filter((item) => item.type === "HEADER")} footers={options.filter((item) => item.type === "FOOTER")} tourGuides={tourGuides} />
    <section className="space-y-3"><h2 className="text-lg font-semibold">Bản đã lưu gần đây</h2><div className="grid gap-3 md:grid-cols-2">{saved.map((item) => <Card key={item.id} className="flex-row items-center justify-between p-4"><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item._count.days} ngày · {item.createdByName} · {item.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></div><Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/quick/${item.id}`} />}><Eye />Xem</Button></Card>)}{!saved.length && <p className="text-sm text-muted-foreground">Chưa có itinerary tạo nhanh.</p>}</div></section>
  </div>;
}
