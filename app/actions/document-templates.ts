"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploaderFolders, uploaderFetchAsUser } from "@/lib/uploader";

const templateSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,50}$/),
  name: z.string().trim().min(2).max(150),
  type: z.enum(["HEADER", "FOOTER", "CONTENT"]),
  description: z.string().trim().max(1000).transform((value) => value || null),
  content: z.string().trim().max(100000),
  imageAlt: z.string().trim().max(300).transform((value) => value || null),
  isDefault: z.boolean(),
});

function parseMetadata(formData: FormData): Record<string, Prisma.InputJsonValue> {
  const keys = formData.getAll("metadataKey").map(String);
  const types = formData.getAll("metadataType").map(String);
  const values = formData.getAll("metadataValue").map(String);
  if (keys.length !== types.length || keys.length !== values.length || keys.length > 50) throw new Error("Thông tin bổ sung không hợp lệ hoặc quá 50 trường.");
  const metadata: Record<string, Prisma.InputJsonValue> = {};
  const seen = new Set<string>();
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index].trim();
    const normalizedKey = key.toLowerCase();
    if (!key || key.length > 80 || /[\u0000-\u001f]/u.test(key) || seen.has(normalizedKey) || ["__proto__", "constructor", "prototype"].includes(normalizedKey)) throw new Error(`Key metadata không hợp lệ hoặc bị trùng: ${key}`);
    seen.add(normalizedKey);
    if (types[index] === "string") metadata[key] = values[index];
    else if (types[index] === "number") {
      if (!values[index].trim() || !Number.isFinite(Number(values[index]))) throw new Error(`Giá trị số không hợp lệ: ${key}`);
      metadata[key] = Number(values[index]);
    } else if (types[index] === "boolean") {
      if (!["true", "false"].includes(values[index])) throw new Error(`Giá trị Đúng/Sai không hợp lệ: ${key}`);
      metadata[key] = values[index] === "true";
    } else if (types[index] === "json") {
      let parsed: unknown;
      try { parsed = JSON.parse(values[index]); } catch { throw new Error(`JSON không hợp lệ: ${key}`); }
      if (!parsed || typeof parsed !== "object") throw new Error(`Giá trị JSON của ${key} phải là đối tượng hoặc danh sách.`);
      metadata[key] = parsed as Prisma.InputJsonValue;
    } else throw new Error(`Kiểu metadata không hợp lệ: ${key}`);
  }
  if (Buffer.byteLength(JSON.stringify(metadata), "utf8") > 16 * 1024) throw new Error("Thông tin bổ sung vượt quá 16 KB.");
  return metadata;
}

function parseTemplate(formData: FormData) {
  return {
    ...templateSchema.parse({
      code: formData.get("code"),
      name: formData.get("name"),
      type: formData.get("type"),
      description: String(formData.get("description") ?? ""),
      content: formData.get("content"),
      imageAlt: String(formData.get("imageAlt") ?? ""),
      isDefault: formData.has("isDefault"),
    }),
    metadata: parseMetadata(formData),
  };
}

async function uploadTemplateImage(file: File, actor: Awaited<ReturnType<typeof requireAdmin>>) {
  if (!file.type.startsWith("image/") || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) throw new Error("Ảnh template chỉ hỗ trợ PNG, JPEG, WEBP hoặc GIF.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh template không được vượt quá 10 MB.");
  const folder = (await getUploaderFolders()).find((item) => item.path.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "") === "Travel/Templates");
  if (!folder) throw new Error("Không tìm thấy thư mục Travel/Templates trên uploader.");
  const body = new FormData();
  body.set("folderId", folder.id);
  body.set("file", file);
  const response = await uploaderFetchAsUser("/api/upload", actor, { method: "POST", body });
  const result = await response.json().catch(() => ({})) as { filename?: string; originalName?: string; mimeType?: string; message?: string };
  if (!response.ok || !result.filename) throw new Error(result.message || "Không thể tải ảnh template lên uploader.");
  return { imageFolderId: folder.id, imageStoredName: result.filename, imageOriginalName: result.originalName || file.name, imageMimeType: result.mimeType || file.type };
}

export async function createDocumentTemplate(formData: FormData) {
  const actor = await requireAdmin();
  const data = parseTemplate(formData);
  const file = formData.get("image");
  const image = file instanceof File && file.size ? await uploadTemplateImage(file, actor) : null;
  if (!data.content && !image) throw new Error("Mẫu phải có nội dung văn bản hoặc ảnh.");
  await prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.documentTemplate.updateMany({ where: { type: data.type, isDefault: true }, data: { isDefault: false } });
    await tx.documentTemplate.create({ data: { ...data, ...image } });
  });
  revalidatePath("/admin/document-templates");
}

export async function updateDocumentTemplate(id: string, formData: FormData) {
  const actor = await requireAdmin();
  const current = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!current) throw new Error("Không tìm thấy mẫu tài liệu.");
  const data = parseTemplate(formData);
  const file = formData.get("image");
  const image = file instanceof File && file.size ? await uploadTemplateImage(file, actor) : null;
  const removeImage = formData.has("removeImage");
  if (!data.content && !image && (removeImage || !current.imageStoredName)) throw new Error("Mẫu phải có nội dung văn bản hoặc ảnh.");
  await prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.documentTemplate.updateMany({ where: { type: data.type, isDefault: true, id: { not: id } }, data: { isDefault: false } });
    await tx.documentTemplate.update({ where: { id }, data: {
      ...data,
      ...(image ?? (removeImage ? { imageFolderId: null, imageStoredName: null, imageOriginalName: null, imageMimeType: null } : {})),
    } });
  });
  revalidatePath("/admin/document-templates");
}

export async function setDocumentTemplateActive(id: string, active: boolean) {
  await requireAdmin();
  const result = await prisma.documentTemplate.updateMany({ where: { id }, data: { active, ...(!active ? { isDefault: false } : {}) } });
  if (!result.count) throw new Error("Không tìm thấy mẫu tài liệu.");
  revalidatePath("/admin/document-templates");
}
