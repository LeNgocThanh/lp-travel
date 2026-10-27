"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILDER_DATASETS, BUILDER_DOCUMENT_TYPES, BUILDER_VARIABLES } from "@/lib/template-builder";

const documentTypes = BUILDER_DOCUMENT_TYPES.map((item) => item.value) as [string, ...string[]];
const documentSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,50}$/, "Mã chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới."),
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự.").max(150),
  description: z.string().trim().max(1000).transform((value) => value || null),
  documentType: z.enum(documentTypes),
});

const blockSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["heading", "text", "field", "divider", "spacer", "repeater", "itinerarySummary", "itineraryDetails", "itineraryInformation", "invoiceParties", "invoiceItems", "invoiceTotals", "paymentOptions", "estimateTables", "estimateProfit"]),
  content: z.string().max(20000).optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  label: z.string().max(200).optional(),
  variable: z.string().max(100).optional(),
  showLabel: z.boolean().optional(),
  thickness: z.number().int().min(1).max(10).optional(),
  style: z.enum(["solid", "dashed", "dotted"]).optional(),
  height: z.number().int().min(4).max(200).optional(),
  dataset: z.string().max(100).optional(),
  columns: z.array(z.string().max(100)).max(20).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  fontSize: z.number().int().min(8).max(72).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  padding: z.number().int().min(0).max(80).optional(),
  marginTop: z.number().int().min(0).max(200).optional(),
}).strict();

const pageSchema = z.object({
  size: z.literal("A4"),
  orientation: z.enum(["portrait", "landscape"]),
  margin: z.number().int().min(0).max(80),
  fontFamily: z.enum(["Arial", "Times New Roman", "Calibri"]),
  fontSize: z.number().int().min(8).max(24),
}).strict();

function parseJson(value: FormDataEntryValue | null, label: string) {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > 100 * 1024) throw new Error(`${label} không hợp lệ hoặc vượt quá giới hạn.`);
  try { return JSON.parse(value) as unknown; } catch { throw new Error(`${label} không hợp lệ.`); }
}

function parseSchema(formData: FormData, documentType: string, contract?: { fields: { key: string }[]; datasets: { key: string; columns: { key: string }[] }[] } | null) {
  const parsed = z.object({ page: pageSchema.optional(), blocks: z.array(blockSchema).max(100) }).strict().parse(parseJson(formData.get("schemaJson"), "Bố cục"));
  const variables = new Set(contract ? contract.fields.map((item) => item.key) : (BUILDER_VARIABLES[documentType] ?? []).map((item) => item.value));
  const datasets = new Map(contract ? contract.datasets.map((item) => [item.key, new Set(item.columns.map((column) => column.key))]) : (BUILDER_DATASETS[documentType] ?? []).map((item) => [item.value, new Set(item.columns.map((column) => column.value))]));
  for (const block of parsed.blocks) {
    if (block.type === "field" && (!block.variable || !variables.has(block.variable))) throw new Error("Trường dữ liệu không thuộc danh sách được phép của loại tài liệu.");
    if (block.type === "repeater") {
      const columns = block.dataset ? datasets.get(block.dataset) : null;
      if (!columns) throw new Error(`Bảng lặp đang dùng dataset không hoạt động hoặc không tồn tại: ${block.dataset || "chưa chọn"}.`);
      if (!block.columns?.length) throw new Error(`Bảng lặp ${block.dataset} chưa chọn cột hiển thị.`);
      const invalidColumns = block.columns.filter((column) => !columns.has(column));
      if (invalidColumns.length) throw new Error(`Dataset ${block.dataset} có cột không hoạt động hoặc chưa được khai báo: ${invalidColumns.join(", ")}.`);
    }
  }
  return parsed as Prisma.InputJsonValue;
}

function parseMetadata(formData: FormData) {
  const value = z.record(z.string(), z.union([z.string().max(5000), z.number().finite(), z.boolean()])).parse(parseJson(formData.get("metadataJson"), "Thông tin bổ sung"));
  const entries = Object.entries(value);
  if (entries.length > 50 || Buffer.byteLength(JSON.stringify(value), "utf8") > 16 * 1024) throw new Error("Thông tin bổ sung vượt quá giới hạn.");
  const seen = new Set<string>();
  for (const [key] of entries) {
    const normalized = key.trim().toLowerCase();
    if (!normalized || key.length > 80 || seen.has(normalized) || ["__proto__", "constructor", "prototype"].includes(normalized)) throw new Error(`Key metadata không hợp lệ hoặc bị trùng: ${key}`);
    seen.add(normalized);
  }
  return value as Prisma.InputJsonValue;
}

export async function createBuilderTemplate(formData: FormData) {
  const actor = await requireAdmin();
  const data = documentSchema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? ""), documentType: formData.get("documentType") });
  await prisma.templateBuilderDocument.create({ data: { ...data, versions: { create: { version: 1, createdById: actor.id, createdByName: actor.fullName } } } });
  revalidatePath("/admin/template-builder");
}

export async function saveBuilderVersion(documentId: string, versionId: string, formData: FormData) {
  await requireAdmin();
  const document = await prisma.templateBuilderDocument.findUnique({ where: { id: documentId }, include: { versions: { where: { id: versionId } } } });
  const version = document?.versions[0];
  if (!document || !version) throw new Error("Không tìm thấy phiên bản template.");
  if (version.status !== "DRAFT") throw new Error("Phiên bản đã phát hành không thể chỉnh sửa.");
  const contract = await prisma.documentDataSource.findUnique({ where: { documentType: document.documentType }, include: { fields: { where: { active: true }, select: { key: true } }, datasets: { where: { active: true }, select: { key: true, columns: { where: { active: true }, select: { key: true } } } } } });
  await prisma.templateBuilderVersion.update({ where: { id: versionId }, data: { schema: parseSchema(formData, document.documentType, contract), metadata: parseMetadata(formData) } });
  revalidatePath(`/admin/template-builder/${documentId}`);
  revalidatePath("/admin/template-builder");
}

export async function publishBuilderVersion(documentId: string, versionId: string) {
  const actor = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const version = await tx.templateBuilderVersion.findFirst({ where: { id: versionId, documentId } });
    if (!version) throw new Error("Không tìm thấy phiên bản template.");
    if (version.status !== "DRAFT") throw new Error("Chỉ có thể phát hành phiên bản nháp.");
    await tx.templateBuilderVersion.update({ where: { id: versionId }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actor.id, publishedByName: actor.fullName } });
    await tx.templateBuilderDocument.update({ where: { id: documentId }, data: { publishedVersionId: versionId } });
  });
  revalidatePath(`/admin/template-builder/${documentId}`);
  revalidatePath("/admin/template-builder");
}

export async function createBuilderDraft(documentId: string) {
  const actor = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const document = await tx.templateBuilderDocument.findUnique({ where: { id: documentId }, include: { versions: { orderBy: { version: "desc" } } } });
    if (!document) throw new Error("Không tìm thấy template.");
    if (document.versions.some((version) => version.status === "DRAFT")) throw new Error("Template đang có một phiên bản nháp.");
    const source = document.versions[0];
    await tx.templateBuilderVersion.create({ data: { documentId, version: (source?.version ?? 0) + 1, schema: source?.schema ?? { blocks: [] }, metadata: source?.metadata ?? {}, createdById: actor.id, createdByName: actor.fullName } });
  });
  revalidatePath(`/admin/template-builder/${documentId}`);
  revalidatePath("/admin/template-builder");
}

export async function setBuilderTemplateActive(id: string, active: boolean) {
  await requireAdmin();
  const result = await prisma.templateBuilderDocument.updateMany({ where: { id }, data: { active, ...(!active ? { isDefault: false } : {}) } });
  if (!result.count) throw new Error("Không tìm thấy template.");
  revalidatePath("/admin/template-builder");
}
