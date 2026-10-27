import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { departmentIdsWithPermission } from "@/lib/department-permissions";

export async function workCaseScope(user: CurrentUser) {
  if (user.role === "ADMIN") return {};
  const managedIds = await departmentIdsWithPermission(user, "canManageWorkCases");
  return { OR: [{ receiverId: user.id }, { departmentId: { in: managedIds ?? [] } }, { tasks: { some: { assignments: { some: { userId: user.id } } } } }] };
}
