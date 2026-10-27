import { Building2, CornerDownRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { orderDepartmentTree } from "@/lib/department-tree";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return letters.toUpperCase();
}

export default async function DepartmentsPage() {
  const currentUser = await requireUser();

  const managerMemberships =
    currentUser.role === "ADMIN"
      ? []
      : await prisma.departmentMembership.findMany({
          where: { userId: currentUser.id, role: "MANAGER", department: { active: true } },
          select: { departmentId: true },
        });
  const managedIds = new Set(managerMemberships.map((m) => m.departmentId));

  const departments = await prisma.department.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      parent: true,
      memberships: {
        where: { user: { active: true } },
        select: { role: true, user: { select: { id: true, fullName: true, username: true } } },
        orderBy: { user: { fullName: "asc" } },
      },
    },
  });
  const departmentTree = orderDepartmentTree(departments);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Danh bạ phòng ban</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hiển thị quan hệ cha–con; quyền được cấp ở cha có thể áp dụng xuống con.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
          <Building2 className="size-4" />
          {departments.length} phòng ban
        </span>
      </div>

      <div className="space-y-4">
        {departmentTree.map((department) => {
          // Quản lý xếp trước, giữ nguyên thứ tự theo tên trong từng nhóm
          const members = [...department.memberships].sort(
            (a, b) => Number(b.role === "MANAGER") - Number(a.role === "MANAGER"),
          );
          const isManagedByMe = managedIds.has(department.id);

          return (
            <Card
              key={department.id}
              style={{ marginLeft: `${Math.min(department.depth, 3) * 1.25}rem` }}
              className={cn(
                "gap-0 overflow-hidden border-l-4 p-0",
                department.depth === 0 ? "border-l-sky-500" : "border-l-sky-200",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{department.name}</h2>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                        {department.code}
                      </code>
                      {isManagedByMe && (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          Bạn là quản lý
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      {department.parent ? (
                        <>
                          <CornerDownRight className="size-3" />
                          Thuộc {department.parent.name}
                        </>
                      ) : (
                        "Cấp gốc"
                      )}
                    </p>
                    {department.description && (
                      <p className="mt-1.5 text-sm text-slate-600">{department.description}</p>
                    )}
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <Users className="size-3.5" />
                  {members.length} thành viên
                </span>
              </div>

              <div className="border-t bg-white p-4 sm:p-5">
                {members.length ? (
                  <ul className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                    {members.map(({ role, user }) => {
                      const isManager = role === "MANAGER";
                      return (
                        <li
                          key={user.id}
                          className="flex items-center gap-3 rounded-lg border bg-slate-50/60 px-3 py-2"
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              isManager ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700",
                            )}
                          >
                            {getInitials(user.fullName)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                          {isManager && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              Quản lý
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có thành viên.</p>
                )}

                {isManagedByMe && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Việc thêm hoặc gỡ thành viên do Admin thực hiện.
                  </p>
                )}
              </div>
            </Card>
          );
        })}

        {!departments.length && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white py-12 text-center">
            <Building2 className="size-8 text-slate-300" />
            <p className="text-sm text-muted-foreground">Chưa có phòng ban nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}