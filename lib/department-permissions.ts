import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DepartmentPermission = string;

export async function departmentIdsWithPermission(user: CurrentUser, permission: DepartmentPermission) {
  if (user.role === "ADMIN") return null;
  const [departments, memberships] = await Promise.all([
    prisma.department.findMany({ select: { id: true, parentId: true } }),
    prisma.departmentMembership.findMany({ where: { userId: user.id, permissionGrants: { some: { permission: { code: permission, active: true } } } }, select: { departmentId: true } })
  ]);
  const allowed = new Set(memberships.map((item) => item.departmentId));
  let changed = true;
  while (changed) {
    changed = false;
    for (const department of departments) if (department.parentId && allowed.has(department.parentId) && !allowed.has(department.id)) { allowed.add(department.id); changed = true; }
  }
  return [...allowed];
}

export async function hasDepartmentPermission(user: CurrentUser, departmentId: string, permission: DepartmentPermission) {
  const ids = await departmentIdsWithPermission(user, permission);
  return ids === null || ids.includes(departmentId);
}
