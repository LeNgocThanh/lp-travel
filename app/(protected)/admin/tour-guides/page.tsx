import { Plus, UserRound } from "lucide-react";
import { createTourGuide, updateTourGuide } from "@/app/actions/tour-guides";
import { FormDialog } from "@/components/form-dialog";
import { TourGuideDeleteButton } from "@/components/tour-guide-delete-button";
import { TourGuideForm } from "@/components/tour-guide-form";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const gender = (value: string) => value === "MALE" ? "Nam" : value === "FEMALE" ? "Nữ" : "Khác";
const date = (value: Date | null) => value?.toLocaleDateString("vi-VN", { timeZone: "UTC" }) ?? "—";

export default async function TourGuidesPage() {
  await requireAdmin(); const guides = await prisma.tourGuide.findMany({ orderBy: { fullName: "asc" } });
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Hướng dẫn viên</h1><p className="text-sm text-muted-foreground">Quản lý thông tin cá nhân, liên hệ và tài khoản ngân hàng của hướng dẫn viên.</p></div><FormDialog title="Tạo hướng dẫn viên" description="Các trường có dấu * là bắt buộc." version={guides.length} triggerLabel="Tạo hướng dẫn viên" triggerIcon={<Plus />} className="sm:max-w-3xl"><TourGuideForm action={createTourGuide} prefix="new-tour-guide" /></FormDialog></div><Card className="gap-0 overflow-hidden p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-slate-50/80"><TableHead className="pl-4">Hướng dẫn viên</TableHead><TableHead>Giới tính</TableHead><TableHead>Ngày sinh</TableHead><TableHead>CMND/CCCD</TableHead><TableHead>Điện thoại</TableHead><TableHead>Địa chỉ thường trú</TableHead><TableHead>Thông tin tài khoản</TableHead><TableHead className="pr-4 text-right">Thao tác</TableHead></TableRow></TableHeader><TableBody>{guides.map((guide) => <TableRow key={guide.id}><TableCell className="pl-4 font-medium"><span className="inline-flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" />{guide.fullName}</span></TableCell><TableCell>{gender(guide.gender)}</TableCell><TableCell>{date(guide.dateOfBirth)}</TableCell><TableCell>{guide.identityNumber}</TableCell><TableCell>{guide.phone}</TableCell><TableCell className="max-w-72 whitespace-normal">{guide.permanentAddress || "—"}</TableCell><TableCell className="min-w-56 text-sm"><p>{guide.accountName || "—"}</p><p className="text-muted-foreground">{[guide.bankAccountNumber, guide.bankName].filter(Boolean).join(" · ") || "—"}</p></TableCell><TableCell className="pr-4"><div className="flex justify-end gap-1"><FormDialog title={`Sửa ${guide.fullName}`} description="Cập nhật thông tin hướng dẫn viên." version={guide.updatedAt.getTime()} triggerLabel="Sửa" triggerVariant="ghost" triggerSize="sm" className="sm:max-w-3xl"><TourGuideForm action={updateTourGuide.bind(null, guide.id)} item={guide} prefix={guide.id} /></FormDialog><TourGuideDeleteButton id={guide.id} /></div></TableCell></TableRow>)}{!guides.length && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">Chưa có hướng dẫn viên.</TableCell></TableRow>}</TableBody></Table></div></Card></div>;
}
