import { Archive, ArchiveRestore, Building2, CheckCircle2, CornerDownRight, Users, type LucideIcon } from "lucide-react";
import { createDepartment, setDepartmentActive, updateDepartment } from "@/app/actions/departments";
import { DepartmentFormDialog } from "@/components/department-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { orderDepartmentTree } from "@/lib/department-tree";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function Stat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <Card className="flex-row items-center gap-3 p-4">
      <span className={cn("flex size-10 items-center justify-center rounded-lg", className)}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export default async function AdminDepartmentsPage() {
  await requireAdmin();

  const departments = await prisma.department.findMany({
    include: { parent: true, _count: { select: { memberships: true, children: true } } },
    orderBy: { name: "asc" },
  });
  const tree = orderDepartmentTree(departments);

  const activeCount = departments.filter((d) => d.active).length;
  const allOptions = tree.map(({ id, name, depth }) => ({ id, name, depth }));

  // Khi sửa: loại chính nó và toàn bộ phòng con khỏi danh sách "phòng ban cha" (tránh vòng lặp).
  // Giả định orderDepartmentTree trả về thứ tự cây (cha đứng ngay trước các con).
  function parentOptionsFor(index: number) {
    const selfDepth = tree[index].depth;
    let end = index + 1;
    while (end < tree.length && tree[end].depth > selfDepth) end++;
    return allOptions.filter((_, i) => i < index || i >= end);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Phòng ban</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cấu trúc cha–con; quyền cấp ở cha được áp dụng xuống các phòng ban con.
          </p>
        </div>
        <DepartmentFormDialog mode="create" action={createDepartment} parentOptions={allOptions} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Building2} label="Tổng phòng ban" value={departments.length} className="bg-sky-50 text-sky-600" />
        <Stat icon={CheckCircle2} label="Đang hoạt động" value={activeCount} className="bg-emerald-50 text-emerald-600" />
        <Stat icon={Archive} label="Đã lưu trữ" value={departments.length - activeCount} className="bg-slate-100 text-slate-500" />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="pl-4">Phòng ban</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead className="hidden text-center md:table-cell">Thành viên</TableHead>
              <TableHead className="hidden text-center md:table-cell">Phòng con</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="pr-4 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tree.map((d, index) => (
              <TableRow key={d.id} className={cn(!d.active && "bg-slate-50/60")}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${Math.min(d.depth, 4) * 20}px` }}>
                    {d.depth > 0 ? (
                      <CornerDownRight className="size-4 shrink-0 text-slate-300" />
                    ) : (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600">
                        <Building2 className="size-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className={cn("truncate font-medium", !d.active && "text-slate-500")}>{d.name}</p>
                      {d.description && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">{d.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                    {d.code}
                  </code>
                </TableCell>
                <TableCell className="hidden text-center md:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <Users className="size-3.5 text-slate-400" />
                    {d._count.memberships}
                  </span>
                </TableCell>
                <TableCell className="hidden text-center text-sm text-slate-600 md:table-cell">
                  {d._count.children}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      d.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }
                  >
                    {d.active ? "Hoạt động" : "Đã lưu trữ"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <DepartmentFormDialog
                      mode="edit"
                      action={updateDepartment.bind(null, d.id)}
                      parentOptions={parentOptionsFor(index)}
                      defaultValues={{
                        name: d.name,
                        code: d.code,
                        parentId: d.parentId,
                        description: d.description,
                      }}
                    />
                    <form action={setDepartmentActive.bind(null, d.id, !d.active)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className={d.active ? "text-slate-600" : "text-emerald-700"}
                      >
                        {d.active ? <Archive /> : <ArchiveRestore />}
                        <span className="hidden lg:inline">{d.active ? "Lưu trữ" : "Kích hoạt"}</span>
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!tree.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Chưa có phòng ban nào. Bấm "Thêm phòng ban" để bắt đầu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}