import { notFound } from "next/navigation";
import { updateUser } from "@/app/actions/users";
import { UserForm } from "@/components/user-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploaderFolders } from "@/lib/uploader";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [user, folders, departments, roles, departmentPermissions, resourcePermissions] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { permissions: true, memberships: { include: { permissionGrants: true, resourcePermissionGrants: true } } } }), getUploaderFolders(),
    prisma.department.findMany({ where: { OR: [{ active: true }, { memberships: { some: { userId: id, isPrimary: true } } }] }, orderBy: { name: "asc" } }),
    prisma.systemRole.findMany({ where: { OR: [{ active: true }, { users: { some: { id } } }] }, orderBy: { name: "asc" } }),
    prisma.departmentPermissionDefinition.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.resourcePermission.findMany({ where: { active: true, resource: { active: true }, basePermission: { active: true } }, include: { resource: true, basePermission: true }, orderBy: [{ resource: { name: "asc" } }, { basePermission: { name: "asc" } }] })
  ]);
  if (!user) notFound();
  return <UserForm action={updateUser.bind(null, id)} folders={folders} departments={departments} roles={roles} departmentPermissions={departmentPermissions} resourcePermissions={resourcePermissions} user={user} />;
}
