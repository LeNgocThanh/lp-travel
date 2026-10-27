"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const masterDataSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/, "Mã chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới."),
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự.").max(100),
  description: z.string().trim().max(1000).transform((value) => value || null),
});

const reservedMetadataKeys = new Set(["id", "code", "name", "description", "active", "createdat", "updatedat", "metadata"]);

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
    if (!key || key.length > 80 || /[\u0000-\u001f]/u.test(key) || reservedMetadataKeys.has(normalizedKey) || seen.has(normalizedKey) || ["__proto__", "constructor", "prototype"].includes(normalizedKey)) throw new Error(`Key metadata không hợp lệ hoặc bị trùng: ${key}`);
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

function parseMasterData(formData: FormData) {
  return { ...masterDataSchema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? "") }), metadata: parseMetadata(formData) };
}

export type ChannelMasterDataKind = "channel" | "country" | "leadSource" | "travelType" | "leadStatus" | "leadQuality" | "preferredContact" | "hotelCategory" | "leadBookingStatus" | "paymentStatus" | "followUpStatus" | "lostReason" | "mealPreference";

function assertKind(kind: string): asserts kind is ChannelMasterDataKind {
  if (!["channel", "country", "leadSource", "travelType", "leadStatus", "leadQuality", "preferredContact", "hotelCategory", "leadBookingStatus", "paymentStatus", "followUpStatus", "lostReason", "mealPreference"].includes(kind)) throw new Error("Loại dữ liệu nền không hợp lệ.");
}

export async function createChannelData(kind: ChannelMasterDataKind, formData: FormData) {
  await requireAdmin();
  assertKind(kind); const data = parseMasterData(formData);
  if (kind === "channel") await prisma.channel.create({ data });
  else if (kind === "country") await prisma.country.create({ data });
  else if (kind === "leadSource") await prisma.leadSource.create({ data });
  else if (kind === "travelType") await prisma.travelType.create({ data });
  else if (kind === "leadStatus") await prisma.leadStatus.create({ data });
  else if (kind === "leadQuality") await prisma.leadQuality.create({ data });
  else if (kind === "preferredContact") await prisma.preferredContact.create({ data });
  else if (kind === "hotelCategory") await prisma.hotelCategory.create({ data });
  else if (kind === "leadBookingStatus") await prisma.leadBookingStatus.create({ data });
  else if (kind === "paymentStatus") await prisma.paymentStatus.create({ data });
  else if (kind === "followUpStatus") await prisma.followUpStatus.create({ data });
  else if (kind === "lostReason") await prisma.lostReason.create({ data });
  else await prisma.mealPreference.create({ data });
  revalidatePath("/admin/channels");
}

export async function updateChannelData(kind: ChannelMasterDataKind, id: string, formData: FormData) {
  await requireAdmin();
  assertKind(kind); const data = parseMasterData(formData);
  if (kind === "channel") await prisma.channel.update({ where: { id }, data });
  else if (kind === "country") await prisma.country.update({ where: { id }, data });
  else if (kind === "leadSource") await prisma.leadSource.update({ where: { id }, data });
  else if (kind === "travelType") await prisma.travelType.update({ where: { id }, data });
  else if (kind === "leadStatus") await prisma.leadStatus.update({ where: { id }, data });
  else if (kind === "leadQuality") await prisma.leadQuality.update({ where: { id }, data });
  else if (kind === "preferredContact") await prisma.preferredContact.update({ where: { id }, data });
  else if (kind === "hotelCategory") await prisma.hotelCategory.update({ where: { id }, data });
  else if (kind === "leadBookingStatus") await prisma.leadBookingStatus.update({ where: { id }, data });
  else if (kind === "paymentStatus") await prisma.paymentStatus.update({ where: { id }, data });
  else if (kind === "followUpStatus") await prisma.followUpStatus.update({ where: { id }, data });
  else if (kind === "lostReason") await prisma.lostReason.update({ where: { id }, data });
  else await prisma.mealPreference.update({ where: { id }, data });
  revalidatePath("/admin/channels");
}

export async function setChannelDataActive(kind: ChannelMasterDataKind, id: string, active: boolean) {
  await requireAdmin();
  assertKind(kind);
  if (kind === "channel") await prisma.channel.update({ where: { id }, data: { active } });
  else if (kind === "country") await prisma.country.update({ where: { id }, data: { active } });
  else if (kind === "leadSource") await prisma.leadSource.update({ where: { id }, data: { active } });
  else if (kind === "travelType") await prisma.travelType.update({ where: { id }, data: { active } });
  else if (kind === "leadStatus") await prisma.leadStatus.update({ where: { id }, data: { active } });
  else if (kind === "leadQuality") await prisma.leadQuality.update({ where: { id }, data: { active } });
  else if (kind === "preferredContact") await prisma.preferredContact.update({ where: { id }, data: { active } });
  else if (kind === "hotelCategory") await prisma.hotelCategory.update({ where: { id }, data: { active } });
  else if (kind === "leadBookingStatus") await prisma.leadBookingStatus.update({ where: { id }, data: { active } });
  else if (kind === "paymentStatus") await prisma.paymentStatus.update({ where: { id }, data: { active } });
  else if (kind === "followUpStatus") await prisma.followUpStatus.update({ where: { id }, data: { active } });
  else if (kind === "lostReason") await prisma.lostReason.update({ where: { id }, data: { active } });
  else await prisma.mealPreference.update({ where: { id }, data: { active } });
  revalidatePath("/admin/channels");
}
