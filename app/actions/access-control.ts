"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ code: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9._-]{1,79}$/), name: z.string().trim().min(2).max(100), description: z.string().trim().max(1000).transform((value) => value || null) });
const refresh = () => { revalidatePath("/admin/access-control"); revalidatePath("/admin/users"); };

export async function createSystemRole(formData: FormData) {
  await requireAdmin(); const data = schema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.systemRole.create({ data: { ...data, code: data.code.toUpperCase(), isSystemAdmin: formData.has("isSystemAdmin") } }); refresh();
}

export async function updateSystemRole(id: string, formData: FormData) {
  await requireAdmin(); const data = schema.omit({ code: true }).parse({ name: formData.get("name"), description: String(formData.get("description") ?? "") }); const isSystemAdmin = formData.has("isSystemAdmin");
  await prisma.$transaction([prisma.systemRole.update({ where: { id }, data: { ...data, isSystemAdmin } }), prisma.user.updateMany({ where: { systemRoleId: id }, data: { role: isSystemAdmin ? "ADMIN" : "USER" } })]); refresh();
}

export async function setSystemRoleActive(id: string, active: boolean) { await requireAdmin(); await prisma.systemRole.update({ where: { id }, data: { active } }); refresh(); }

export async function createDepartmentPermission(formData: FormData) {
  await requireAdmin(); const data = schema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.departmentPermissionDefinition.create({ data }); refresh();
}

export async function updateDepartmentPermission(id: string, formData: FormData) {
  await requireAdmin(); const data = schema.omit({ code: true }).parse({ name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.departmentPermissionDefinition.update({ where: { id }, data }); refresh();
}

export async function setDepartmentPermissionActive(id: string, active: boolean) { await requireAdmin(); await prisma.departmentPermissionDefinition.update({ where: { id }, data: { active } }); refresh(); }

export async function createAccessResource(formData: FormData) {
  await requireAdmin(); const data = schema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.accessResource.create({ data: { ...data, code: data.code.toUpperCase() } }); refresh();
}

export async function updateAccessResource(id: string, formData: FormData) {
  await requireAdmin(); const data = schema.omit({ code: true }).parse({ name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.accessResource.update({ where: { id }, data }); refresh();
}

export async function setAccessResourceActive(id: string, active: boolean) { await requireAdmin(); await prisma.accessResource.update({ where: { id }, data: { active } }); refresh(); }

export async function createBasePermission(formData: FormData) {
  await requireAdmin(); const data = schema.parse({ code: formData.get("code"), name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.basePermission.create({ data: { ...data, code: data.code.toUpperCase() } }); refresh();
}

export async function updateBasePermission(id: string, formData: FormData) {
  await requireAdmin(); const data = schema.omit({ code: true }).parse({ name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.basePermission.update({ where: { id }, data }); refresh();
}

export async function setBasePermissionActive(id: string, active: boolean) { await requireAdmin(); await prisma.basePermission.update({ where: { id }, data: { active } }); refresh(); }

const resourcePermissionSchema = z.object({ name: z.string().trim().min(2).max(100), resourceId: z.string().min(1), basePermissionId: z.string().min(1), description: z.string().trim().max(1000).transform((value) => value || null) });

export async function createResourcePermission(formData: FormData) {
  await requireAdmin(); const data = resourcePermissionSchema.parse({ name: formData.get("name"), resourceId: formData.get("resourceId"), basePermissionId: formData.get("basePermissionId"), description: String(formData.get("description") ?? "") });
  const [resource, permission] = await Promise.all([prisma.accessResource.findFirst({ where: { id: data.resourceId, active: true } }), prisma.basePermission.findFirst({ where: { id: data.basePermissionId, active: true } })]);
  if (!resource || !permission) throw new Error("Tài nguyên hoặc quyền gốc không hợp lệ.");
  if (await prisma.resourcePermission.findUnique({ where: { resourceId_basePermissionId: { resourceId: data.resourceId, basePermissionId: data.basePermissionId } } })) throw new Error("Tổ hợp quyền tài nguyên đã tồn tại.");
  await prisma.resourcePermission.create({ data }); refresh();
}

export async function updateResourcePermission(id: string, formData: FormData) {
  await requireAdmin(); const data = resourcePermissionSchema.parse({ name: formData.get("name"), resourceId: formData.get("resourceId"), basePermissionId: formData.get("basePermissionId"), description: String(formData.get("description") ?? "") });
  const [resource, permission] = await Promise.all([prisma.accessResource.findFirst({ where: { id: data.resourceId, active: true } }), prisma.basePermission.findFirst({ where: { id: data.basePermissionId, active: true } })]);
  if (!resource || !permission) throw new Error("Tài nguyên hoặc quyền gốc không hợp lệ.");
  const duplicate = await prisma.resourcePermission.findFirst({ where: { resourceId: data.resourceId, basePermissionId: data.basePermissionId, id: { not: id } } });
  if (duplicate) throw new Error("Tổ hợp quyền tài nguyên đã tồn tại.");
  await prisma.resourcePermission.update({ where: { id }, data }); refresh();
}

export async function setResourcePermissionActive(id: string, active: boolean) { await requireAdmin(); await prisma.resourcePermission.update({ where: { id }, data: { active } }); refresh(); }
