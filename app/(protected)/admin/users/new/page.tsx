import { createUser } from "@/app/actions/users";
import { UserForm } from "@/components/user-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploaderFolders } from "@/lib/uploader";

export default async function NewUserPage() {
  await requireAdmin();
  const [folders, departments, roles, departmentPermissions, resourcePermissions] = await Promise.all([getUploaderFolders(), prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.systemRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.departmentPermissionDefinition.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.resourcePermission.findMany({ where: { active: true, resource: { active: true }, basePermission: { active: true } }, include: { resource: true, basePermission: true }, orderBy: [{ resource: { name: "asc" } }, { basePermission: { name: "asc" } }] })]);
  return <UserForm action={createUser} folders={folders} departments={departments} roles={roles} departmentPermissions={departmentPermissions} resourcePermissions={resourcePermissions} />;
}
