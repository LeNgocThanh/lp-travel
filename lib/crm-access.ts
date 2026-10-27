import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { departmentIdsWithPermission } from "@/lib/department-permissions";

export async function customerScope(user: CurrentUser, manage = false) {
  if (user.role === "ADMIN") return {};
  const [viewIds, manageIds] = await Promise.all([departmentIdsWithPermission(user, "canViewCustomers"), departmentIdsWithPermission(user, "canManageCustomers")]);
  const ids = manage ? (manageIds ?? []) : [...new Set([...(viewIds ?? []), ...(manageIds ?? [])])];
  return { OR: [{ ownerId: user.id }, { workCases: { some: { departmentId: { in: ids } } } }] };
}
