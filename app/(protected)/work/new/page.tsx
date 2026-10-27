import { createWorkCase } from "@/app/actions/work-cases";
import { WorkCaseForm } from "@/components/work-case-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { departmentIdsWithPermission } from "@/lib/department-permissions";

export default async function NewWorkCasePage() {
  const user = await requireUser();
  const memberships = user.root ? [] : await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true, role: true } });
  const departmentIds = memberships.map((item) => item.departmentId);
  const inheritedManagedIds = await departmentIdsWithPermission(user, "canManageWorkCases");
  const availableDepartmentIds = [...new Set([...departmentIds, ...(inheritedManagedIds ?? [])])];
  const [departments, users, customers, products] = await Promise.all([
    prisma.department.findMany({ where: { active: true, ...(user.role === "ADMIN" ? {} : { id: { in: availableDepartmentIds } }) }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { active: true, ...(user.role === "ADMIN" ? {} : { OR: [{ id: user.id }, { memberships: { some: { departmentId: { in: inheritedManagedIds ?? [] } } } }] }) },
      include: { memberships: { where: { isPrimary: true }, include: { department: true } } },
      orderBy: { fullName: "asc" }
    }),
    prisma.customer.findMany({ where: { active: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" }, take: 500 })
  ]);
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">Tạo hồ sơ việc</h1><p className="text-sm text-muted-foreground">Có thể chọn dữ liệu nền hoặc nhập nhanh khách hàng và nhu cầu ngay trong hồ sơ.</p></div><WorkCaseForm action={createWorkCase} departments={departments.map((item) => ({ id: item.id, name: item.name }))} users={users.map((item) => ({ id: item.id, name: item.fullName, extra: item.memberships[0]?.department.name }))} customers={customers.map((item) => ({ id: item.id, name: item.name, extra: item.code }))} products={products.map((item) => ({ id: item.id, name: item.name, extra: item.type }))} canSaveMasterData={user.role === "ADMIN" || (inheritedManagedIds?.length ?? 0) > 0} /></div>;
}
