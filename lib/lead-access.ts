import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function hasResourceAction(user: CurrentUser, resourceCode: string, actionCode: string) {
  if (user.role === "ADMIN") return true;
  return Boolean(await prisma.departmentMembershipResourcePermission.findFirst({ where: { membership: { userId: user.id }, resourcePermission: { active: true, resource: { code: resourceCode, active: true }, basePermission: { code: actionCode, active: true } } }, select: { membershipId: true } }));
}

export async function requireResourceAction(user: CurrentUser, resourceCode: string, actionCode: string) {
  if (!(await hasResourceAction(user, resourceCode, actionCode))) throw new Error(`Bạn không có quyền ${actionCode} trên tài nguyên ${resourceCode}.`);
}

export async function getLeadFieldAccess(user: CurrentUser) {
  const fields = await prisma.leadFieldConfig.findMany({ where: { active: true }, include: { rolePermissions: { where: { systemRole: { code: user.roleCode, active: true } } } }, orderBy: { displayOrder: "asc" } });
  const readable = new Set<string>(); const writable = new Set<string>();
  for (const field of fields) {
    if (user.role === "ADMIN" || field.rolePermissions.some((permission) => permission.canRead || permission.canWrite)) readable.add(field.fieldKey);
    if (user.role === "ADMIN" || field.rolePermissions.some((permission) => permission.canWrite)) writable.add(field.fieldKey);
  }
  return { fields, readable, writable };
}
