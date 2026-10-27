"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSchema = z.object({
  fullName: z.string().trim().min(2),
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.union([z.email(), z.literal("")]).transform((value) => value || null),
  phoneNumber: z.string().trim().max(30).transform((value) => value || null),
  citizenId: z.union([z.string().regex(/^\d{12}$/), z.literal("")]).transform((value) => value || null),
  departmentId: z.string().trim().transform((value) => value || null),
  departmentRole: z.enum(["MANAGER", "MEMBER"]),
  systemRoleId: z.string().min(1),
  active: z.boolean(),
  password: z.string()
});

const actions = ["canUpload", "canList", "canRead", "canDelete", "canCreateFolder"] as const;

function permissionsFromForm(formData: FormData) {
  const folderIds = formData.getAll("folderId").map(String);
  return folderIds.map((folderId) => ({
    folderId,
    folderPath: String(formData.get(`folderPath.${folderId}`) ?? ""),
    canUpload: formData.has(`${folderId}.canUpload`),
    canList: formData.has(`${folderId}.canList`),
    canRead: formData.has(`${folderId}.canRead`),
    canDelete: formData.has(`${folderId}.canDelete`),
    canCreateFolder: formData.has(`${folderId}.canCreateFolder`)
  })).filter((permission) => actions.some((action) => permission[action]));
}

async function departmentPermissionsFromForm(formData: FormData) {
  const ids = [...new Set(formData.getAll("departmentPermissionId").map(String))];
  const permissions = ids.length ? await prisma.departmentPermissionDefinition.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, code: true } }) : [];
  if (permissions.length !== ids.length) throw new Error("Quyền phòng ban không hợp lệ.");
  const codes = new Set(permissions.map((permission) => permission.code));
  return { ids, legacy: { canManageMembers: codes.has("canManageMembers"), canManageWorkCases: codes.has("canManageWorkCases"), canAssignTasks: codes.has("canAssignTasks"), canManageBookings: codes.has("canManageBookings"), canViewReports: codes.has("canViewReports"), canViewCustomers: codes.has("canViewCustomers"), canManageCustomers: codes.has("canManageCustomers") } };
}

async function resourcePermissionsFromForm(formData: FormData) {
  const ids = [...new Set(formData.getAll("resourcePermissionId").map(String))];
  const permissions = ids.length ? await prisma.resourcePermission.findMany({ where: { id: { in: ids }, active: true, resource: { active: true }, basePermission: { active: true } }, select: { id: true } }) : [];
  if (permissions.length !== ids.length) throw new Error("Quyền tài nguyên không hợp lệ.");
  return ids;
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const data = userSchema.parse({
    fullName: formData.get("fullName"), username: formData.get("username"),
    email: String(formData.get("email") ?? "").trim(), phoneNumber: String(formData.get("phoneNumber") ?? "").trim(),
    citizenId: String(formData.get("citizenId") ?? "").trim(),
    departmentId: String(formData.get("departmentId") ?? ""), departmentRole: formData.get("departmentRole") ?? "MEMBER",
    systemRoleId: formData.get("systemRoleId"),
    active: formData.get("active") === "on", password: formData.get("password")
  });
  if (data.password.length < 8) throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
  const [department, systemRole, departmentPermissions, resourcePermissions] = await Promise.all([data.departmentId ? prisma.department.findFirst({ where: { id: data.departmentId, active: true } }) : null, prisma.systemRole.findFirst({ where: { id: data.systemRoleId, active: true } }), departmentPermissionsFromForm(formData), resourcePermissionsFromForm(formData)]);
  if (data.departmentId && !department) throw new Error("Phòng ban không hợp lệ.");
  if (!systemRole) throw new Error("Vai trò không hợp lệ.");
  await prisma.user.create({
    data: {
      fullName: data.fullName, username: data.username, email: data.email, phoneNumber: data.phoneNumber,
      citizenId: data.citizenId, department: department?.name ?? null, role: systemRole.isSystemAdmin ? "ADMIN" : "USER", systemRoleId: systemRole.id, active: data.active,
      passwordHash: await hash(data.password, 12), permissions: { create: permissionsFromForm(formData) },
      memberships: department ? { create: { departmentId: department.id, role: data.departmentRole, isPrimary: true, ...departmentPermissions.legacy, permissionGrants: { create: departmentPermissions.ids.map((permissionId) => ({ permissionId })) }, resourcePermissionGrants: { create: resourcePermissions.map((resourcePermissionId) => ({ resourcePermissionId })) } } } : undefined
    }
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();
  const data = userSchema.parse({
    fullName: formData.get("fullName"), username: formData.get("username"),
    email: String(formData.get("email") ?? "").trim(), phoneNumber: String(formData.get("phoneNumber") ?? "").trim(),
    citizenId: String(formData.get("citizenId") ?? "").trim(),
    departmentId: String(formData.get("departmentId") ?? ""), departmentRole: formData.get("departmentRole") ?? "MEMBER",
    systemRoleId: formData.get("systemRoleId"),
    active: formData.get("active") === "on", password: String(formData.get("password") ?? "")
  });
  const passwordHash = data.password ? await hash(data.password, 12) : undefined;
  const [department, systemRole, departmentPermissions, resourcePermissions] = await Promise.all([data.departmentId ? prisma.department.findFirst({ where: { id: data.departmentId, OR: [{ active: true }, { memberships: { some: { userId: id, isPrimary: true } } }] } }) : null, prisma.systemRole.findFirst({ where: { id: data.systemRoleId, OR: [{ active: true }, { users: { some: { id } } }] } }), departmentPermissionsFromForm(formData), resourcePermissionsFromForm(formData)]);
  if (data.departmentId && !department) throw new Error("Phòng ban không hợp lệ.");
  if (!systemRole) throw new Error("Vai trò không hợp lệ.");
  await prisma.$transaction(async (tx) => {
    await tx.folderPermission.deleteMany({ where: { userId: id } });
    await tx.departmentMembership.deleteMany({ where: { userId: id, isPrimary: true } });
    await tx.user.update({
      where: { id },
      data: {
        fullName: data.fullName, username: data.username, email: data.email, phoneNumber: data.phoneNumber,
        citizenId: data.citizenId, department: department?.name ?? null, role: systemRole.isSystemAdmin ? "ADMIN" : "USER", systemRoleId: systemRole.id, active: data.active, passwordHash,
        permissions: { create: permissionsFromForm(formData) },
        memberships: department ? { create: { departmentId: department.id, role: data.departmentRole, isPrimary: true, ...departmentPermissions.legacy, permissionGrants: { create: departmentPermissions.ids.map((permissionId) => ({ permissionId })) }, resourcePermissionGrants: { create: resourcePermissions.map((resourcePermissionId) => ({ resourcePermissionId })) } } } : undefined
      }
    });
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(id: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}
