import { notFound } from "next/navigation";
import { createBuilderDraft, publishBuilderVersion, saveBuilderVersion } from "@/app/actions/template-builder";
import { TemplateBuilderEditor } from "@/components/template-builder-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILDER_DOCUMENT_TYPES, type BuilderMetadata, type BuilderSchema } from "@/lib/template-builder";

export default async function TemplateBuilderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const document = await prisma.templateBuilderDocument.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" } }, publishedVersion: true } });
  if (!document) notFound();
  const draft = document.versions.find((version) => version.status === "DRAFT");
  const current = draft ?? document.publishedVersion ?? document.versions[0];
  const typeLabel = BUILDER_DOCUMENT_TYPES.find((item) => item.value === document.documentType)?.label ?? document.documentType;
  const contract = await prisma.documentDataSource.findUnique({ where: { documentType: document.documentType }, include: { fields: { where: { active: true }, orderBy: { displayOrder: "asc" } }, datasets: { where: { active: true }, orderBy: { displayOrder: "asc" }, include: { columns: { where: { active: true }, orderBy: { displayOrder: "asc" } } } } } });
  const variableOptions = contract?.fields.map((field) => ({ value: field.key, label: field.label, sample: field.defaultValue ?? field.key })) ?? undefined;
  const datasetOptions = contract?.datasets.map((dataset) => ({ value: dataset.key, label: dataset.label, columns: dataset.columns.map((column) => ({ value: column.key, label: column.label })) })) ?? undefined;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">{document.name}</h1><Badge variant="outline">{typeLabel}</Badge></div><p className="text-sm text-muted-foreground">{document.code} · Template Builder độc lập, chưa được dùng để sinh tài liệu thật.</p></div><div className="flex gap-2">{draft ? <WorkCaseActionForm action={publishBuilderVersion.bind(null, document.id, draft.id)}><Button type="submit" variant="outline">Phát hành v{draft.version}</Button></WorkCaseActionForm> : <WorkCaseActionForm action={createBuilderDraft.bind(null, document.id)}><Button type="submit">Tạo bản nháp mới</Button></WorkCaseActionForm>}</div></div>
    <div className="flex flex-wrap gap-2">{document.versions.map((version) => <Badge key={version.id} variant={version.id === current?.id ? "default" : "outline"}>v{version.version} · {version.status === "DRAFT" ? "Bản nháp" : "Đã phát hành"}</Badge>)}</div>
    {!current && <Card className="p-6 text-muted-foreground">Template chưa có phiên bản.</Card>}
    {current && current.status !== "DRAFT" && <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Phiên bản đã phát hành là bất biến. Hãy tạo bản nháp mới để chỉnh sửa.</Card>}
    {current && <TemplateBuilderEditor action={saveBuilderVersion.bind(null, document.id, current.id)} documentType={document.documentType} initialSchema={current.schema as unknown as BuilderSchema} initialMetadata={current.metadata as unknown as BuilderMetadata} variableOptions={variableOptions} datasetOptions={datasetOptions} readOnly={current.status !== "DRAFT"} />}
  </div>;
}
