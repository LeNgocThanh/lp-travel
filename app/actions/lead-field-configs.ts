"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ label: z.string().trim().min(1).max(100), groupCode: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,49}$/), displayOrder: z.coerce.number().int().min(1).max(1000), active: z.boolean() });

export async function updateLeadFieldConfig(id: string, formData: FormData) {
  await requireAdmin();
  const data = schema.parse({ label: formData.get("label"), groupCode: String(formData.get("groupCode") ?? "").toUpperCase(), displayOrder: formData.get("displayOrder"), active: formData.has("active") });
  const roles = await prisma.systemRole.findMany({ select: { id: true } });
  await prisma.$transaction(async (tx) => {
    await tx.leadFieldConfig.update({ where: { id }, data });
    for (const role of roles) {
      const canWrite = formData.has(`${role.id}.canWrite`); const canRead = canWrite || formData.has(`${role.id}.canRead`);
      await tx.leadFieldRolePermission.upsert({ where: { fieldConfigId_systemRoleId: { fieldConfigId: id, systemRoleId: role.id } }, create: { fieldConfigId: id, systemRoleId: role.id, canRead, canWrite }, update: { canRead, canWrite } });
    }
  });
  revalidatePath("/admin/lead-fields"); revalidatePath("/leads");
}
