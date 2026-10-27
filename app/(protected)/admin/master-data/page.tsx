import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export default async function MasterDataPage() {
  await requireAdmin();
  return <div className="space-y-5"><h1 className="text-2xl font-semibold">Dữ liệu nền du lịch</h1><div className="grid gap-4 md:grid-cols-3">
    <Card><CardHeader><CardTitle>Khách hàng</CardTitle></CardHeader><CardContent><Link href="/admin/customers" className="text-sky-700 underline">Quản lý khách hàng</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Nhà cung cấp</CardTitle></CardHeader><CardContent><Link href="/admin/suppliers" className="text-sky-700 underline">Quản lý nhà cung cấp</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Kênh và phân loại</CardTitle></CardHeader><CardContent><Link href="/admin/channels" className="text-sky-700 underline">Quản lý Channel, Country, Lead Source và Travel Type</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Tour và dịch vụ</CardTitle></CardHeader><CardContent><Link href="/admin/products" className="text-sky-700 underline">Quản lý sản phẩm</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Mẫu tài liệu</CardTitle></CardHeader><CardContent><Link href="/admin/document-templates" className="text-sky-700 underline">Quản lý header, footer và nội dung mẫu</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Itinerary Information</CardTitle></CardHeader><CardContent><Link href="/admin/itinerary-settings" className="text-sky-700 underline">Quản lý Inclusions, Exclusions và NOTES</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Invoice Settings</CardTitle></CardHeader><CardContent><Link href="/admin/invoice-settings" className="text-sky-700 underline">Quản lý các phương án thanh toán</Link></CardContent></Card>
  </div></div>;
}
