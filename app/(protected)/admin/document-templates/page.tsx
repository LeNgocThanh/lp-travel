import { Archive, ArchiveRestore, LayoutTemplate } from "lucide-react";
import { createDocumentTemplate, setDocumentTemplateActive, updateDocumentTemplate } from "@/app/actions/document-templates";
import { DocumentTemplateForm } from "@/components/document-template-form";
import { FormDialog } from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const typeLabel = { HEADER: "Header", FOOTER: "Footer", CONTENT: "Nội dung khác" };

export default async function DocumentTemplatesPage() {
  await requireAdmin();
  const templates = await prisma.documentTemplate.findMany({ orderBy: [{ active: "desc" }, { type: "asc" }, { name: "asc" }] });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Mẫu tài liệu</h1><p className="text-sm text-muted-foreground">Quản lý header, footer và các khối nội dung dùng lại cho itinerary và tài liệu sau này.</p></div><FormDialog title="Tạo mẫu tài liệu" description="Mẫu mới chưa tự động áp dụng cho tài liệu hiện tại." version={templates.length} triggerLabel="Tạo mẫu" triggerIcon={<LayoutTemplate />} className="sm:max-w-3xl"><DocumentTemplateForm action={createDocumentTemplate} prefix="new-document-template" /></FormDialog></div>
    <Card className="gap-0 overflow-hidden p-0"><Table><TableHeader><TableRow className="bg-slate-50/80"><TableHead className="pl-4">Mẫu</TableHead><TableHead>Loại</TableHead><TableHead>Nội dung</TableHead><TableHead>Trạng thái</TableHead><TableHead className="pr-4 text-right">Thao tác</TableHead></TableRow></TableHeader><TableBody>
      {templates.map((template) => <TableRow key={template.id}><TableCell className="pl-4"><p className="font-medium">{template.name}</p><code className="text-xs text-muted-foreground">{template.code}</code></TableCell><TableCell><Badge variant="outline">{typeLabel[template.type]}</Badge>{template.isDefault && <Badge className="ml-2">Mặc định</Badge>}</TableCell><TableCell className="max-w-md">{template.imageStoredName && <Badge variant="secondary" className="mb-1">Có ảnh</Badge>}<p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{template.content || (template.imageStoredName ? template.imageOriginalName : "—")}</p></TableCell><TableCell><Badge variant="outline" className={template.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>{template.active ? "Hoạt động" : "Đã lưu trữ"}</Badge></TableCell><TableCell className="pr-4"><div className="flex justify-end gap-1"><FormDialog title={template.name} description={typeLabel[template.type]} version={template.updatedAt.getTime()} triggerLabel="Chi tiết" triggerVariant="ghost" triggerSize="sm" className="sm:max-w-3xl"><DocumentTemplateForm action={updateDocumentTemplate.bind(null, template.id)} item={template} prefix={template.id} /></FormDialog><WorkCaseActionForm action={setDocumentTemplateActive.bind(null, template.id, !template.active)}><Button type="submit" variant="ghost" size="sm">{template.active ? <Archive /> : <ArchiveRestore />}{template.active ? "Lưu trữ" : "Khôi phục"}</Button></WorkCaseActionForm></div></TableCell></TableRow>)}
      {!templates.length && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Chưa có mẫu tài liệu.</TableCell></TableRow>}
    </TableBody></Table></Card>
  </div>;
}
