"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const departmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/),
  description: z.string().trim().max(500).transform((value) => value || null),
  parentId: z.string().trim().transform((value) => value || null)
});

function parseDepartment(formData: FormData) {
  return departmentSchema.parse({ name: formData.get("name"), code: formData.get("code"), description: formData.get("description"), parentId: String(formData.get("parentId") ?? "") });
}

async function validateParent(id: string | null, parentId: string | null) {
  if (!parentId) return;
  if (id === parentId) throw new Error("Phòng ban không thể là cha của chính nó.");
  const departments = await prisma.department.findMany({ select: { id: true, parentId: true } });
  let current: string | null = parentId; const visited = new Set<string>();
  while (current) { if (current === id || visited.has(current)) throw new Error("Cấu trúc phòng ban tạo thành vòng lặp."); visited.add(current); current = departments.find((item) => item.id === current)?.parentId ?? null; }
  if (!departments.some((item) => item.id === parentId)) throw new Error("Phòng ban cha không hợp lệ.");
}

export async function createDepartment(formData: FormData) {
  await requireAdmin();
  const data = parseDepartment(formData); await validateParent(null, data.parentId);
  await prisma.department.create({ data });
  revalidatePath("/admin/departments");
  revalidatePath("/departments");
}

export async function updateDepartment(id: string, formData: FormData) {
  await requireAdmin();
  const data = parseDepartment(formData); await validateParent(id, data.parentId);
  await prisma.$transaction(async (tx) => {
    const department = await tx.department.update({ where: { id }, data });
    await tx.user.updateMany({ where: { memberships: { some: { departmentId: id, isPrimary: true } } }, data: { department: department.name } });
  });
  revalidatePath("/admin/departments");
  revalidatePath("/departments");
  revalidatePath("/admin/users");
}

export async function setDepartmentActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.department.update({ where: { id }, data: { active } });
  revalidatePath("/admin/departments");
  revalidatePath("/departments");
}
