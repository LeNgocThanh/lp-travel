import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { deleteUser } from "@/app/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: { systemRole: true, memberships: { where: { isPrimary: true }, include: { department: true } }, _count: { select: { permissions: true } } } });
  return <Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Người dùng</CardTitle><CardDescription>Tạo tài khoản và phân quyền truy cập kho tài liệu.</CardDescription></div><Button nativeButton={false} render={<Link href="/admin/users/new" />}><Plus />Tạo user</Button></CardHeader>
    <CardContent><Table><TableHeader><TableRow><TableHead>Họ tên</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Phòng ban</TableHead><TableHead>Folder được cấp</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader><TableBody>
      {users.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.fullName}</TableCell><TableCell>{user.username}</TableCell><TableCell><Badge variant="secondary">{user.systemRole.name}</Badge></TableCell><TableCell>{user.memberships[0] ? `${user.memberships[0].department.name}${user.memberships[0].role === "MANAGER" ? " · Quản lý" : ""}` : user.department || "—"}</TableCell><TableCell>{user._count.permissions}</TableCell><TableCell><Badge variant={user.active ? "default" : "outline"}>{user.active ? "Hoạt động" : "Đã khóa"}</Badge></TableCell><TableCell className="flex justify-end gap-2"><Button nativeButton={false} render={<Link href={`/admin/users/${user.id}`} />} size="icon-sm" variant="outline"><Pencil /></Button><form action={deleteUser.bind(null, user.id)}><Button type="submit" size="icon-sm" variant="destructive"><Trash2 /></Button></form></TableCell></TableRow>)}
      {!users.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Chưa có user nào.</TableCell></TableRow>}
    </TableBody></Table></CardContent></Card>;
}
