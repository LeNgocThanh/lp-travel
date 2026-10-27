"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const schema = z.object({
  fullName: z.string().trim().min(2, "Tên hướng dẫn viên phải có ít nhất 2 ký tự.").max(150),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "Giới tính không hợp lệ." }),
  dateOfBirth: z.string().trim().regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ."),
  identityNumber: z.string().trim().min(5, "CMND/CCCD phải có ít nhất 5 ký tự.").max(30),
  permanentAddress: optional(1000),
  taxCode: optional(30),
  phone: z.string().trim().min(3, "Số điện thoại phải có ít nhất 3 ký tự.").max(30),
  accountName: optional(150),
  bankAccountNumber: optional(50),
  bankName: optional(150),
});

function parse(formData: FormData) {
  const data = schema.parse({ fullName: formData.get("fullName"), gender: formData.get("gender"), dateOfBirth: String(formData.get("dateOfBirth") ?? ""), identityNumber: formData.get("identityNumber"), permanentAddress: String(formData.get("permanentAddress") ?? ""), taxCode: String(formData.get("taxCode") ?? ""), phone: formData.get("phone"), accountName: String(formData.get("accountName") ?? ""), bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""), bankName: String(formData.get("bankName") ?? "") });
  return { ...data, dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : null };
}

export async function createTourGuide(formData: FormData) {
  await requireAdmin(); const data = parse(formData);
  if (await prisma.tourGuide.findUnique({ where: { identityNumber: data.identityNumber } })) throw new Error("CMND/CCCD này đã tồn tại.");
  await prisma.tourGuide.create({ data }); revalidatePath("/admin/tour-guides");
}

export async function updateTourGuide(id: string, formData: FormData) {
  await requireAdmin(); const data = parse(formData);
  if (await prisma.tourGuide.findFirst({ where: { identityNumber: data.identityNumber, id: { not: id } } })) throw new Error("CMND/CCCD này đã tồn tại.");
  await prisma.tourGuide.update({ where: { id }, data }); revalidatePath("/admin/tour-guides");
}

export async function deleteTourGuide(id: string) {
  await requireAdmin(); await prisma.tourGuide.delete({ where: { id } }); revalidatePath("/admin/tour-guides");
}
