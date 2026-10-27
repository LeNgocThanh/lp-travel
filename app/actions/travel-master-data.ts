"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/);
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const partySchema = z.object({
  code,
  name: z.string().trim().min(2).max(150),
  partyType: z.enum(["PERSON", "ORGANIZATION"]),
  phone: optionalText(30),
  email: z.union([z.email(), z.literal("")]).transform((value) => value || null),
  taxId: optionalText(30),
  notes: optionalText(2000)
});
const productSchema = z.object({
  code,
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/),
  description: optionalText(2000)
});
const supplierTypeSchema = z.object({ code, name: z.string().trim().min(2).max(100), description: optionalText(1000) });
const supplierAddressSchema = z.object({ label: optionalText(100), address: z.string().trim().min(3).max(1000), isPrimary: z.boolean() });
const supplierPhoneSchema = z.object({ label: optionalText(100), phone: z.string().trim().min(3).max(30), isPrimary: z.boolean() });
const itineraryDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(365),
  title: optionalText(150),
  startLocation: optionalText(200),
  endLocation: optionalText(200),
  activityLocation: optionalText(500),
  accommodation: optionalText(300),
  flight: optionalText(500),
  breakfast: z.boolean(),
  lunch: z.boolean(),
  dinner: z.boolean(),
  description: optionalText(5000),
  notes: optionalText(2000)
});

const reservedMetadataKeys = new Set(["id", "code", "name", "partytype", "phone", "email", "taxid", "notes", "type", "description", "active", "createdat", "updatedat", "metadata", "suppliertypeid", "productid", "daynumber", "title", "startlocation", "endlocation", "activitylocation", "accommodation", "flight", "breakfast", "lunch", "dinner"]);

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
    if (!key || key.length > 80 || /[\u0000-\u001f]/u.test(key) || reservedMetadataKeys.has(normalizedKey) || seen.has(normalizedKey) || ["__proto__", "constructor", "prototype"].includes(normalizedKey)) {
      throw new Error(`Key metadata không hợp lệ hoặc bị trùng: ${key}`);
    }
    seen.add(normalizedKey);
    if (types[index] === "string") metadata[key] = values[index];
    else if (types[index] === "number") {
      if (!values[index].trim() || !Number.isFinite(Number(values[index]))) throw new Error(`Giá trị số không hợp lệ: ${key}`);
      metadata[key] = Number(values[index]);
    } else if (types[index] === "boolean") {
      if (values[index] !== "true" && values[index] !== "false") throw new Error(`Giá trị Đúng/Sai không hợp lệ: ${key}`);
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

function parseParty(formData: FormData) {
  return { ...partySchema.parse({
    code: formData.get("code"), name: formData.get("name"), partyType: formData.get("partyType"),
    phone: String(formData.get("phone") ?? ""), email: String(formData.get("email") ?? "").trim(),
    taxId: String(formData.get("taxId") ?? ""), notes: String(formData.get("notes") ?? "")
  }), metadata: parseMetadata(formData) };
}

function parseProduct(formData: FormData) {
  return { ...productSchema.parse({
    code: formData.get("code"), name: formData.get("name"), type: formData.get("type"),
    description: String(formData.get("description") ?? "")
  }), metadata: parseMetadata(formData) };
}

function parseItineraryDay(formData: FormData) {
  return { ...itineraryDaySchema.parse({ dayNumber: formData.get("dayNumber"), title: String(formData.get("title") ?? ""), startLocation: String(formData.get("startLocation") ?? ""), endLocation: String(formData.get("endLocation") ?? ""), activityLocation: String(formData.get("activityLocation") ?? ""), accommodation: String(formData.get("accommodation") ?? ""), flight: String(formData.get("flight") ?? ""), breakfast: formData.has("breakfast"), lunch: formData.has("lunch"), dinner: formData.has("dinner"), description: String(formData.get("description") ?? ""), notes: String(formData.get("notes") ?? "") }), metadata: parseMetadata(formData) };
}

function revalidateProduct(productId: string) { revalidatePath("/admin/products"); revalidatePath(`/admin/products/${productId}`); revalidatePath("/products"); }

type PartyKind = "customer" | "supplier";

function revalidateParty(kind: PartyKind) {
  revalidatePath(kind === "customer" ? "/admin/customers" : "/admin/suppliers");
}

async function supplierTypeId(formData: FormData) {
  const id = String(formData.get("supplierTypeId") ?? "") || null;
  if (id && !(await prisma.supplierType.findUnique({ where: { id } }))) throw new Error("Loại nhà cung cấp không hợp lệ.");
  return id;
}

export async function createParty(kind: PartyKind, formData: FormData) {
  await requireAdmin();
  const data = parseParty(formData);
  if (kind === "customer") await prisma.customer.create({ data });
  else if (kind === "supplier") await prisma.$transaction(async (tx) => { const supplier = await tx.supplier.create({ data: { ...data, supplierTypeId: await supplierTypeId(formData) } }); if (data.phone) await tx.supplierPhone.create({ data: { supplierId: supplier.id, label: "Số chính", phone: data.phone, isPrimary: true } }); });
  else throw new Error("Loại dữ liệu không hợp lệ.");
  revalidateParty(kind);
}

export async function updateParty(kind: PartyKind, id: string, formData: FormData) {
  await requireAdmin();
  const data = parseParty(formData);
  if (kind === "customer") await prisma.customer.update({ where: { id }, data });
  else if (kind === "supplier") await prisma.$transaction(async (tx) => { await tx.supplier.update({ where: { id }, data: { ...data, supplierTypeId: await supplierTypeId(formData) } }); await tx.supplierPhone.updateMany({ where: { supplierId: id, isPrimary: true }, data: { isPrimary: false } }); if (data.phone) await tx.supplierPhone.upsert({ where: { supplierId_phone: { supplierId: id, phone: data.phone } }, create: { supplierId: id, label: "Số chính", phone: data.phone, isPrimary: true }, update: { isPrimary: true } }); });
  else throw new Error("Loại dữ liệu không hợp lệ.");
  revalidateParty(kind);
}

export async function setPartyActive(kind: PartyKind, id: string, active: boolean) {
  await requireAdmin();
  if (kind === "customer") await prisma.customer.update({ where: { id }, data: { active } });
  else if (kind === "supplier") await prisma.supplier.update({ where: { id }, data: { active } });
  else throw new Error("Loại dữ liệu không hợp lệ.");
  revalidateParty(kind);
}

export async function createSupplierType(formData: FormData) {
  await requireAdmin(); const data = supplierTypeSchema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.supplierType.create({ data: { ...data, metadata: parseMetadata(formData) } }); revalidatePath("/admin/supplier-types"); revalidatePath("/admin/suppliers");
}

export async function updateSupplierType(id: string, formData: FormData) {
  await requireAdmin(); const data = supplierTypeSchema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.supplierType.update({ where: { id }, data: { ...data, metadata: parseMetadata(formData) } }); revalidatePath("/admin/supplier-types"); revalidatePath("/admin/suppliers");
}

export async function setSupplierTypeActive(id: string, active: boolean) { await requireAdmin(); await prisma.supplierType.update({ where: { id }, data: { active } }); revalidatePath("/admin/supplier-types"); revalidatePath("/admin/suppliers"); }

function refreshSupplier(id: string) { revalidatePath("/admin/suppliers"); revalidatePath(`/admin/suppliers/${id}`); }

export async function createSupplierAddress(supplierId: string, formData: FormData) {
  await requireAdmin(); if (!(await prisma.supplier.findUnique({ where: { id: supplierId } }))) throw new Error("Không tìm thấy nhà cung cấp.");
  const data = supplierAddressSchema.parse({ label: String(formData.get("label") ?? ""), address: formData.get("address"), isPrimary: formData.has("isPrimary") }); const count = await prisma.supplierAddress.count({ where: { supplierId } });
  await prisma.$transaction(async (tx) => { if (data.isPrimary || count === 0) await tx.supplierAddress.updateMany({ where: { supplierId }, data: { isPrimary: false } }); await tx.supplierAddress.create({ data: { supplierId, ...data, isPrimary: data.isPrimary || count === 0 } }); }); refreshSupplier(supplierId);
}

export async function updateSupplierAddress(supplierId: string, addressId: string, formData: FormData) {
  await requireAdmin(); const current = await prisma.supplierAddress.findFirst({ where: { id: addressId, supplierId } }); if (!current) throw new Error("Không tìm thấy địa chỉ.");
  const data = supplierAddressSchema.parse({ label: String(formData.get("label") ?? ""), address: formData.get("address"), isPrimary: formData.has("isPrimary") }); const primary = data.isPrimary || current.isPrimary;
  await prisma.$transaction(async (tx) => { if (primary) await tx.supplierAddress.updateMany({ where: { supplierId }, data: { isPrimary: false } }); await tx.supplierAddress.update({ where: { id: addressId }, data: { ...data, isPrimary: primary } }); }); refreshSupplier(supplierId);
}

export async function deleteSupplierAddress(supplierId: string, addressId: string) {
  await requireAdmin(); const address = await prisma.supplierAddress.findFirst({ where: { id: addressId, supplierId } }); if (!address) throw new Error("Không tìm thấy địa chỉ.");
  await prisma.$transaction(async (tx) => { await tx.supplierAddress.delete({ where: { id: addressId } }); if (address.isPrimary) { const next = await tx.supplierAddress.findFirst({ where: { supplierId }, orderBy: { createdAt: "asc" } }); if (next) await tx.supplierAddress.update({ where: { id: next.id }, data: { isPrimary: true } }); } }); refreshSupplier(supplierId);
}

export async function createSupplierPhone(supplierId: string, formData: FormData) {
  await requireAdmin(); if (!(await prisma.supplier.findUnique({ where: { id: supplierId } }))) throw new Error("Không tìm thấy nhà cung cấp.");
  const data = supplierPhoneSchema.parse({ label: String(formData.get("label") ?? ""), phone: formData.get("phone"), isPrimary: formData.has("isPrimary") }); if (await prisma.supplierPhone.findFirst({ where: { supplierId, phone: data.phone } })) throw new Error("Số điện thoại này đã tồn tại."); const count = await prisma.supplierPhone.count({ where: { supplierId } }); const primary = data.isPrimary || count === 0;
  await prisma.$transaction(async (tx) => { if (primary) await tx.supplierPhone.updateMany({ where: { supplierId }, data: { isPrimary: false } }); await tx.supplierPhone.create({ data: { supplierId, ...data, isPrimary: primary } }); if (primary) await tx.supplier.update({ where: { id: supplierId }, data: { phone: data.phone } }); }); refreshSupplier(supplierId);
}

export async function updateSupplierPhone(supplierId: string, phoneId: string, formData: FormData) {
  await requireAdmin(); const current = await prisma.supplierPhone.findFirst({ where: { id: phoneId, supplierId } }); if (!current) throw new Error("Không tìm thấy số điện thoại.");
  const data = supplierPhoneSchema.parse({ label: String(formData.get("label") ?? ""), phone: formData.get("phone"), isPrimary: formData.has("isPrimary") }); const primary = data.isPrimary || current.isPrimary;
  if (await prisma.supplierPhone.findFirst({ where: { supplierId, phone: data.phone, id: { not: phoneId } } })) throw new Error("Số điện thoại này đã tồn tại.");
  await prisma.$transaction(async (tx) => { if (primary) await tx.supplierPhone.updateMany({ where: { supplierId }, data: { isPrimary: false } }); await tx.supplierPhone.update({ where: { id: phoneId }, data: { ...data, isPrimary: primary } }); if (primary) await tx.supplier.update({ where: { id: supplierId }, data: { phone: data.phone } }); }); refreshSupplier(supplierId);
}

export async function deleteSupplierPhone(supplierId: string, phoneId: string) {
  await requireAdmin(); const phone = await prisma.supplierPhone.findFirst({ where: { id: phoneId, supplierId } }); if (!phone) throw new Error("Không tìm thấy số điện thoại.");
  await prisma.$transaction(async (tx) => { await tx.supplierPhone.delete({ where: { id: phoneId } }); if (phone.isPrimary) { const next = await tx.supplierPhone.findFirst({ where: { supplierId }, orderBy: { createdAt: "asc" } }); if (next) await tx.supplierPhone.update({ where: { id: next.id }, data: { isPrimary: true } }); await tx.supplier.update({ where: { id: supplierId }, data: { phone: next?.phone ?? null } }); } }); refreshSupplier(supplierId);
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  await prisma.product.create({ data: parseProduct(formData) });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: parseProduct(formData) });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function setProductActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { active } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function createProductItineraryDay(productId: string, formData: FormData) {
  await requireAdmin(); const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, type: true } });
  if (!product) throw new Error("Không tìm thấy tour.");
  if (product.type !== "TOUR") throw new Error("Lịch trình theo ngày chỉ áp dụng cho sản phẩm loại TOUR.");
  const data = parseItineraryDay(formData); if (await prisma.productItineraryDay.findFirst({ where: { productId, dayNumber: data.dayNumber } })) throw new Error(`Ngày ${data.dayNumber} đã có trong lịch trình.`);
  await prisma.productItineraryDay.create({ data: { productId, ...data } }); revalidateProduct(productId);
}

export async function updateProductItineraryDay(productId: string, dayId: string, formData: FormData) {
  await requireAdmin(); const day = await prisma.productItineraryDay.findFirst({ where: { id: dayId, productId } });
  if (!day) throw new Error("Không tìm thấy ngày trong lịch trình.");
  const data = parseItineraryDay(formData); if (await prisma.productItineraryDay.findFirst({ where: { productId, dayNumber: data.dayNumber, id: { not: dayId } } })) throw new Error(`Ngày ${data.dayNumber} đã có trong lịch trình.`);
  await prisma.productItineraryDay.update({ where: { id: dayId }, data }); revalidateProduct(productId);
}

export async function deleteProductItineraryDay(productId: string, dayId: string) {
  await requireAdmin(); const result = await prisma.productItineraryDay.deleteMany({ where: { id: dayId, productId } });
  if (!result.count) throw new Error("Không tìm thấy ngày trong lịch trình.");
  revalidateProduct(productId);
}
