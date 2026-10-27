import type { Department, DepartmentMembership, FolderPermission, SystemRole, User } from "@prisma/client";
import type { UploaderFolder } from "@/lib/uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserWithPermissions = User & { permissions: FolderPermission[]; memberships: (DepartmentMembership & { permissionGrants: { permissionId: string }[]; resourcePermissionGrants: { resourcePermissionId: string }[] })[] };
type DepartmentPermissionOption = { id: string; code: string; name: string; description: string | null };
type ResourcePermissionOption = { id: string; name: string; description: string | null; basePermission: { code: string; name: string }; resource: { id: string; code: string; name: string } };

export function UserForm({ action, folders, departments, roles, departmentPermissions, resourcePermissions, user }: { action: (formData: FormData) => void | Promise<void>; folders: UploaderFolder[]; departments: Department[]; roles: SystemRole[]; departmentPermissions: DepartmentPermissionOption[]; resourcePermissions: ResourcePermissionOption[]; user?: UserWithPermissions }) {
  const byFolder = new Map(user?.permissions.map((item) => [item.folderId, item]));
  const primaryMembership = user?.memberships.find((item) => item.isPrimary);
  return <form action={action} className="space-y-6"><Card><CardHeader><CardTitle>{user ? "Chỉnh sửa user" : "Tạo user"}</CardTitle><CardDescription>Thông tin đăng nhập và vai trò hệ thống.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="fullName">Họ và tên</Label><Input id="fullName" name="fullName" defaultValue={user?.fullName} required /></div>
    <div className="space-y-2"><Label htmlFor="username">Tên đăng nhập</Label><Input id="username" name="username" defaultValue={user?.username} required /></div>
    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} /></div>
    <div className="space-y-2"><Label htmlFor="phoneNumber">Số điện thoại</Label><Input id="phoneNumber" name="phoneNumber" type="tel" maxLength={30} defaultValue={user?.phoneNumber ?? ""} /></div>
    <div className="space-y-2"><Label htmlFor="citizenId">CCCD</Label><Input id="citizenId" name="citizenId" inputMode="numeric" pattern="[0-9]{12}" maxLength={12} defaultValue={user?.citizenId ?? ""} /></div>
    <div className="space-y-2"><Label htmlFor="departmentId">Phòng ban chính</Label><select id="departmentId" name="departmentId" defaultValue={primaryMembership?.departmentId ?? ""} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Chưa chọn</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="departmentRole">Quyền trong phòng ban</Label><select id="departmentRole" name="departmentRole" defaultValue={primaryMembership?.role ?? "MEMBER"} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="MEMBER">Thành viên</option><option value="MANAGER">Quản lý</option></select></div>
    <div className="space-y-2"><Label htmlFor="password">Mật khẩu {user && "mới (để trống nếu giữ nguyên)"}</Label><Input id="password" name="password" type="password" minLength={user ? undefined : 8} required={!user} /></div>
    <div className="space-y-2"><Label htmlFor="systemRoleId">Vai trò</Label><select id="systemRoleId" name="systemRoleId" defaultValue={user?.systemRoleId ?? roles[0]?.id} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" required>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}{role.isSystemAdmin ? " · Toàn quyền" : ""}</option>)}</select></div>
    <label className="flex items-center gap-2"><Checkbox name="active" defaultChecked={user?.active ?? true} /> Tài khoản hoạt động</label>
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Quyền phòng ban</CardTitle><CardDescription>Quyền tại phòng ban chính được kế thừa xuống toàn bộ phòng ban con. Admin hệ thống luôn có đầy đủ quyền.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
    {departmentPermissions.map((permission) => <label key={permission.id} className="flex items-start gap-2"><Checkbox name="departmentPermissionId" value={permission.id} defaultChecked={primaryMembership?.permissionGrants.some((grant) => grant.permissionId === permission.id) ?? false} /><span>{permission.name}{permission.description && <small className="block text-muted-foreground">{permission.description}</small>}</span></label>)}
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Quyền tài nguyên</CardTitle><CardDescription>Quyền được gán tại phòng ban chính và được nhóm theo từng tài nguyên.</CardDescription></CardHeader><CardContent className="space-y-5">
    {[...new Map(resourcePermissions.map((permission) => [permission.resource.id, permission.resource])).values()].map((resource) => <section key={resource.id} className="rounded-lg border p-4"><h3 className="font-medium">{resource.name} <code className="text-xs text-muted-foreground">{resource.code}</code></h3><div className="mt-3 grid gap-3 md:grid-cols-2">{resourcePermissions.filter((permission) => permission.resource.id === resource.id).map((permission) => <label key={permission.id} className="flex items-start gap-2"><Checkbox name="resourcePermissionId" value={permission.id} defaultChecked={primaryMembership?.resourcePermissionGrants.some((grant) => grant.resourcePermissionId === permission.id) ?? false} /><span>{permission.name}<small className="block text-muted-foreground">{permission.basePermission.name}{permission.description ? ` · ${permission.description}` : ""}</small></span></label>)}</div></section>)}
    {!resourcePermissions.length && <p className="text-sm text-muted-foreground">Chưa có quyền tài nguyên đang hoạt động.</p>}
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Quyền theo thư mục</CardTitle><CardDescription>Quyền user được kiểm tra trước quyền của token uploader. Quyền ở thư mục cha áp dụng cho các thư mục con.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Thư mục</TableHead><TableHead>Upload</TableHead><TableHead>List</TableHead><TableHead>Read</TableHead><TableHead>Delete</TableHead><TableHead>Create folder</TableHead></TableRow></TableHeader><TableBody>
    {folders.map((folder) => { const permission = byFolder.get(folder.id); return <TableRow key={folder.id}><TableCell className="font-mono">/{folder.path}</TableCell><TableCell colSpan={5} className="p-0"><input type="hidden" name="folderId" value={folder.id} /><input type="hidden" name={`folderPath.${folder.id}`} value={folder.path} /><div className="grid grid-cols-5 items-center py-2">{(["canUpload", "canList", "canRead", "canDelete", "canCreateFolder"] as const).map((key) => <Checkbox key={key} name={`${folder.id}.${key}`} defaultChecked={permission?.[key]} />)}</div></TableCell></TableRow>; })}
  </TableBody></Table></div></CardContent></Card>
  <Button type="submit">{user ? "Lưu thay đổi" : "Tạo user"}</Button></form>;
}
