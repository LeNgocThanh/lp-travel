import Link from "next/link";
import { Archive, ArchiveRestore, LayoutTemplate, Plus } from "lucide-react";
import { createBuilderTemplate, setBuilderTemplateActive } from "@/app/actions/template-builder";
import { FormDialog } from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILDER_DOCUMENT_TYPES } from "@/lib/template-builder";

export default async function TemplateBuilderPage() {
  await requireAdmin();
  const documents = await prisma.templateBuilderDocument.findMany({ include: { versions: { orderBy: { version: "desc" } }, publishedVersion: true }, orderBy: [{ active: "desc" }, { updatedAt: "desc" }] });
  const typeLabels = Object.fromEntries(BUILDER_DOCUMENT_TYPES.map((item) => [item.value, item.label]));

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Template Builder</h1><p className="text-sm text-muted-foreground">Module thử nghiệm độc lập, chưa áp dụng vào lịch trình, Invoice hoặc các mẫu tài liệu hiện tại.</p></div><FormDialog title="Tạo template thử nghiệm" description="Template mới bắt đầu ở phiên bản nháp 1." version={documents.length} triggerLabel="Tạo template" triggerIcon={<Plus />}><WorkCaseActionForm action={createBuilderTemplate} className="space-y-4"><div className="space-y-2"><Label htmlFor="builder-code">Mã</Label><Input id="builder-code" name="code" placeholder="ITINERARY_V2" required /></div><div className="space-y-2"><Label htmlFor="builder-name">Tên</Label><Input id="builder-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="builder-type">Loại tài liệu</Label><select id="builder-type" name="documentType" className="h-9 w-full rounded-md border px-2">{BUILDER_DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="builder-description">Mô tả</Label><Textarea id="builder-description" name="description" /></div><Button type="submit">Tạo bản nháp</Button></WorkCaseActionForm></FormDialog></div>
    <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Phạm vi an toàn:</strong> module này dùng bảng dữ liệu, action và route riêng. Việc phát hành tại đây chỉ đánh dấu phiên bản trong Template Builder, không thay đổi tài liệu đang sử dụng.</Card>
    <div className="grid gap-4 lg:grid-cols-2">{documents.map((document) => { const draft = document.versions.find((version) => version.status === "DRAFT"); return <Card key={document.id} className="gap-4 p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{document.name}</h2><Badge variant="outline">{typeLabels[document.documentType] ?? document.documentType}</Badge></div><code className="text-xs text-muted-foreground">{document.code}</code></div><Badge variant={document.active ? "default" : "secondary"}>{document.active ? "Hoạt động" : "Đã lưu trữ"}</Badge></div>{document.description && <p className="text-sm text-muted-foreground">{document.description}</p>}<div className="flex gap-4 text-sm"><span>Đã phát hành: <strong>{document.publishedVersion ? `v${document.publishedVersion.version}` : "Chưa có"}</strong></span><span>Bản nháp: <strong>{draft ? `v${draft.version}` : "Không có"}</strong></span></div><div className="flex flex-wrap justify-end gap-2"><Button nativeButton={false} render={<Link href={`/admin/template-builder/${document.id}`} />}>Mở trình thiết kế</Button><WorkCaseActionForm action={setBuilderTemplateActive.bind(null, document.id, !document.active)}><Button type="submit" variant="outline">{document.active ? <Archive /> : <ArchiveRestore />}{document.active ? "Lưu trữ" : "Khôi phục"}</Button></WorkCaseActionForm></div></Card>; })}{!documents.length && <Card className="col-span-full items-center p-12 text-center text-muted-foreground"><LayoutTemplate className="size-10" /><p>Chưa có template thử nghiệm.</p></Card>}</div>
  </div>;
}
