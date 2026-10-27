"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const required = (max: number) => z.string().trim().min(1, "Vui lòng nhập đầy đủ thông tin bắt buộc.").max(max);
const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const schema = z.object({
  companyName: required(200),
  taxCode: required(50),
  phone: optional(50),
  address: required(1000),
  legalRepresentative: required(150),
  legalRepresentativeTitle: required(150),
  authorizationNumber: optional(100),
  authorizedTitleDefault: optional(150),
  bankName: required(300),
  bankAccountNumber: required(100),
  signingPlace: required(150),
  contractCopies: z.coerce.number().int().min(1).max(100),
  legalBases: optional(50000),
  article4: optional(50000),
  article5: optional(50000),
  article6: optional(50000),
  article7: optional(50000),
});

export async function saveTourGuideContractSetting(formData: FormData) {
  await requireAdmin();
  const data = schema.parse({ companyName: formData.get("companyName"), taxCode: formData.get("taxCode"), phone: String(formData.get("phone") ?? ""), address: formData.get("address"), legalRepresentative: formData.get("legalRepresentative"), legalRepresentativeTitle: formData.get("legalRepresentativeTitle"), authorizationNumber: String(formData.get("authorizationNumber") ?? ""), authorizedTitleDefault: String(formData.get("authorizedTitleDefault") ?? ""), bankName: formData.get("bankName"), bankAccountNumber: formData.get("bankAccountNumber"), signingPlace: formData.get("signingPlace"), contractCopies: formData.get("contractCopies"), legalBases: String(formData.get("legalBases") ?? ""), article4: String(formData.get("article4") ?? ""), article5: String(formData.get("article5") ?? ""), article6: String(formData.get("article6") ?? ""), article7: String(formData.get("article7") ?? "") });
  await prisma.tourGuideContractSetting.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  revalidatePath("/admin/tour-guide-contract-settings");
}
