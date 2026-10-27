import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Trash2 } from "lucide-react";
import { createProductItineraryDay, deleteProductItineraryDay, updateProductItineraryDay } from "@/app/actions/travel-master-data";
import { FormDialog } from "@/components/form-dialog";
import { ProductItineraryDayForm } from "@/components/product-itinerary-day-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminProductItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { itineraryDays: { orderBy: { dayNumber: "asc" } } } });
  if (!product) notFound();
  return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Button nativeButton={false} render={<Link href="/admin/products" />} variant="ghost">← Tour và dịch vụ</Button><h1 className="mt-2 text-2xl font-semibold">Lịch trình: {product.name}</h1><p className="text-sm text-muted-foreground">{product.code} · {product.type} · {product.itineraryDays.length} ngày</p></div>{product.type === "TOUR" && <FormDialog title="Thêm ngày vào lịch trình" description="Mỗi số ngày chỉ xuất hiện một lần trong tour." version={product.itineraryDays.length} triggerLabel="Thêm ngày" triggerIcon={<CalendarDays />} className="sm:max-w-2xl"><ProductItineraryDayForm action={createProductItineraryDay.bind(null, product.id)} /></FormDialog>}</div>
    {product.type !== "TOUR" && <Card><CardHeader><CardTitle>Không áp dụng lịch trình ngày</CardTitle><CardDescription>Chức năng này chỉ áp dụng cho sản phẩm có loại `TOUR`.</CardDescription></CardHeader></Card>}
    <div className="space-y-4">{product.itineraryDays.map((day) => <Card key={day.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Badge>Ngày {day.dayNumber}</Badge><CardTitle>{day.title || "Chưa đặt tiêu đề"}</CardTitle></div><CardDescription className="mt-2 flex items-center gap-1"><MapPin className="size-4" /> {day.startLocation || "Chưa có điểm bắt đầu"} → {day.endLocation || "Chưa có điểm kết thúc"}</CardDescription></div><div className="flex gap-2"><FormDialog title={`Chỉnh sửa ngày ${day.dayNumber}`} version={day.updatedAt.getTime()} triggerLabel="Chỉnh sửa" triggerVariant="outline" triggerSize="sm" className="sm:max-w-2xl"><ProductItineraryDayForm action={updateProductItineraryDay.bind(null, product.id, day.id)} item={day} /></FormDialog><WorkCaseActionForm action={deleteProductItineraryDay.bind(null, product.id, day.id)}><Button type="submit" size="sm" variant="destructive"><Trash2 /> Xóa</Button></WorkCaseActionForm></div></div></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex flex-wrap gap-2"><Badge variant="outline">Sáng: {day.breakfast ? "Có" : "Không"}</Badge><Badge variant="outline">Trưa: {day.lunch ? "Có" : "Không"}</Badge><Badge variant="outline">Tối: {day.dinner ? "Có" : "Không"}</Badge></div><p><span className="font-medium">Lưu trú:</span> {day.accommodation || "—"}</p>{day.description && <p className="whitespace-pre-wrap text-slate-700">{day.description}</p>}{day.notes && <p className="rounded-md bg-slate-50 p-2 text-muted-foreground">Ghi chú: {day.notes}</p>}</CardContent></Card>)}{product.type === "TOUR" && !product.itineraryDays.length && <div className="rounded-xl border border-dashed bg-white py-12 text-center text-sm text-muted-foreground">Tour chưa có lịch trình theo ngày.</div>}</div>
  </div>;
}
