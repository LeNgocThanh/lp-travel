import Link from "next/link";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import { notFound } from "next/navigation";
import { getTourOperationOrderInitial, regenerateTourOperationOrder, saveTourOperationOrder } from "@/app/actions/tour-operation-orders";
import { TourOperationOrderExportActions, type TourOperationOrderExportData } from "@/components/tour-operation-order-export-actions";
import { TourOperationOrderForm } from "@/components/tour-operation-order-form";
import { Button } from "@/components/ui/button";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const dateValue = (value: Date) => value.toISOString().slice(0, 10);
const displayDate = (value: Date) => new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(value);

export default async function TourOperationOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const actor = await requireUser(); const { id } = await params; const { edit } = await searchParams;
  const itinerary = await prisma.quickItinerary.findUnique({ where: { id }, select: { createdById: true, leadId: true, b2bLeadId: true, tourOperationOrder: true } });
  if (!itinerary || (!itinerary.leadId && !itinerary.b2bLeadId)) notFound();
  const [canRead, canUpdate] = await Promise.all([hasResourceAction(actor, "LEADS", "READ"), hasResourceAction(actor, "LEADS", "UPDATE")]);
  const ownsItem = actor.role === "ADMIN" || itinerary.createdById === actor.id;
  if (!ownsItem && !canRead) notFound();
  const order = itinerary.tourOperationOrder;

  if (!order || edit === "1") {
    if (!ownsItem && !canUpdate) notFound();
    const initial = order ? { companyName: order.companyName, companyAddress: order.companyAddress, companyPhone: order.companyPhone ?? "", companyTaxCode: order.companyTaxCode, tourCode: order.tourCode, guestCount: order.guestCount, startDate: dateValue(order.startDate), endDate: dateValue(order.endDate), tourName: order.tourName, tourGuideNames: order.tourGuideNames ?? "", operatorName: order.operatorName ?? "", operatorTitle: order.operatorTitle ?? "", decisionText: order.decisionText } : await getTourOperationOrderInitial(id);
    return <div className="space-y-5"><Link href={order ? `/quick/${id}/tour-operation-order` : `/quick/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />{order ? "Quay lại bản xem" : "Quay lại lịch trình"}</Link><div><h1 className="text-2xl font-semibold">{order ? "Sửa" : "Tạo"} lệnh điều Tour</h1><p className="text-sm text-muted-foreground">Dữ liệu đã được điền từ lịch trình và Contract Settings; tất cả trường đều có thể sửa lại.</p></div><TourOperationOrderForm action={saveTourOperationOrder.bind(null, id)} initial={initial} /></div>;
  }

  const period = `${displayDate(order.startDate)} – ${displayDate(order.endDate)}`;
  const exportData: TourOperationOrderExportData = { companyName: order.companyName, companyAddress: order.companyAddress, companyPhone: order.companyPhone, companyTaxCode: order.companyTaxCode, tourCode: order.tourCode, guestCount: order.guestCount, period, tourName: order.tourName, tourGuideNames: order.tourGuideNames, operatorName: order.operatorName, operatorTitle: order.operatorTitle, decisionText: order.decisionText };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/quick/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Quay lại lịch trình</Link><div className="flex flex-wrap gap-2"><TourOperationOrderExportActions targetId="tour-operation-order-a4" data={exportData} />{(ownsItem || canUpdate) && <WorkCaseActionForm action={regenerateTourOperationOrder.bind(null, id)}><Button type="submit" variant="outline"><RefreshCw />Gen lại từ dữ liệu gốc</Button></WorkCaseActionForm>}{(ownsItem || canUpdate) && <Button nativeButton={false} render={<Link href={`/quick/${id}/tour-operation-order?edit=1`} />}><Pencil />Sửa</Button>}</div></div>
    <p className="text-xs text-muted-foreground">Tạo bởi {order.createdByName} lúc {order.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })} · Sửa bởi {order.updatedByName} lúc {order.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}</p>
    <div className="overflow-x-auto pb-4"><article id="tour-operation-order-a4" className="mx-auto min-h-[297mm] w-[210mm] bg-white px-[18mm] py-[16mm] font-['Times_New_Roman'] text-[13pt] leading-[1.45] text-black shadow-lg">
      <div className="grid grid-cols-2 gap-8 text-center text-[12pt] font-bold"><div>{order.companyName}</div><div><p>{"CỘNG HÒA X\u00C3 HỘI CHỦ NGHĨA VIỆT NAM"}</p><p className="underline underline-offset-4">Độc Lập - Tự do - Hạnh Phúc</p></div></div>
      <h1 className="mt-[18mm] text-center text-[20pt] font-bold">LỆNH ĐIỀU TOUR</h1>
      <section className="mt-[10mm] space-y-1"><p className="font-bold">{order.companyName}</p><p><strong>- Địa chỉ:</strong> {order.companyAddress}</p>{order.companyPhone && <p><strong>- Điện thoại:</strong> {order.companyPhone}.</p>}<p><strong>- Mã số thuế:</strong> {order.companyTaxCode}.</p>{order.operatorName && <p><strong>- Điều hành:</strong> {order.operatorName}.</p>}{order.operatorTitle && <p><strong>- Chức vụ:</strong> {order.operatorTitle}.</p>}</section>
      <p className="my-[7mm]">{order.decisionText}</p>
      <table className="w-full border-collapse"><tbody>{[["Mã code", order.tourCode], ["Số khách", order.guestCount], ["Thời gian", period], ["Tour tham quan", order.tourName], ["Hướng dẫn viên", order.tourGuideNames || ""], ["Điều hành tour", order.operatorName || ""]].map(([label, value]) => <tr key={label}><th className="w-[42mm] border border-black p-2 text-left">{label}</th><td className="whitespace-pre-line border border-black p-2">{value}</td></tr>)}</tbody></table>
      <div className="mt-[18mm] grid grid-cols-2 text-center"><div /><div><p className="font-bold">Đơn vị kinh doanh</p><p className="italic">(Ký tên, đóng dấu (nếu có))</p><p className="font-bold">{order.operatorTitle || "Điều hành"}</p><p className="mt-[22mm] font-bold">{order.operatorName}</p></div></div>
    </article></div>
  </div>;
}
