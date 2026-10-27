import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function departmentTree() {
  return prisma.department.findMany({ select: { id: true, parentId: true } });
}

export function expandDepartmentDescendants(departments: Array<{ id: string; parentId: string | null }>, roots: string[]) {
  const ids = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const department of departments) if (department.parentId && ids.has(department.parentId) && !ids.has(department.id)) { ids.add(department.id); changed = true; }
  }
  return [...ids];
}

export async function manageableNewsDepartmentIds(user: CurrentUser) {
  if (user.role === "ADMIN") return null;
  const [departments, memberships] = await Promise.all([
    departmentTree(),
    prisma.departmentMembership.findMany({ where: { userId: user.id, role: "MANAGER" }, select: { departmentId: true } })
  ]);
  return expandDepartmentDescendants(departments, memberships.map((item) => item.departmentId));
}

export async function visibleNewsAudienceIds(user: CurrentUser) {
  if (user.role === "ADMIN") return null;
  const [departments, memberships] = await Promise.all([
    departmentTree(),
    prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true } })
  ]);
  const visible = new Set(memberships.map((item) => item.departmentId));
  let changed = true;
  while (changed) {
    changed = false;
    for (const department of departments) if (visible.has(department.id) && department.parentId && !visible.has(department.parentId)) { visible.add(department.parentId); changed = true; }
  }
  return [...visible];
}

export async function newsPostScope(user: CurrentUser) {
  if (user.role === "ADMIN") return {};
  const departmentIds = await visibleNewsAudienceIds(user);
  return { OR: [
    { authorId: user.id },
    { status: "PUBLISHED" as const, audienceType: "ALL" as const },
    { status: "PUBLISHED" as const, audienceType: "DEPARTMENTS" as const, audiences: { some: { departmentId: { in: departmentIds ?? [] } } } }
  ] };
}
