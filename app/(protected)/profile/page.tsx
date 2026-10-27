import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = user.root ? null : await prisma.user.findUnique({
    where: { id: user.id },
    select: { fullName: true, email: true, phoneNumber: true, citizenId: true, department: true, memberships: { where: { isPrimary: true }, select: { role: true, department: { select: { name: true } } } } }
  });
  return <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Thông tin tài khoản</CardTitle><CardDescription>Thông tin nhận diện trong hệ thống.</CardDescription></CardHeader><CardContent className="space-y-5">
    <div><p className="text-sm text-muted-foreground">Tên đăng nhập</p><p className="font-medium">{user.username}</p></div>
    {!user.root && profile && <>
      <ProfileForm profile={profile} />
      <div><p className="text-sm text-muted-foreground">Phòng ban</p><p className="font-medium">{profile?.memberships[0]?.department.name || profile?.department || "Chưa cập nhật"}{profile?.memberships[0]?.role === "MANAGER" ? " · Quản lý" : ""}</p></div>
    </>}
    {user.root && <div><p className="text-sm text-muted-foreground">Họ và tên</p><p className="font-medium">{user.fullName}</p></div>}
    <div><p className="text-sm text-muted-foreground">Vai trò</p><Badge>{user.roleName}</Badge></div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Đổi mật khẩu</CardTitle><CardDescription>{user.root ? "Root Admin đổi mật khẩu bằng biến môi trường." : "Sử dụng mật khẩu mạnh có ít nhất 8 ký tự."}</CardDescription></CardHeader><CardContent>{user.root ? <p className="text-sm text-muted-foreground">Cập nhật ROOT_ADMIN_PASSWORD trong file .env và khởi động lại ứng dụng.</p> : <ChangePasswordForm />}</CardContent></Card></div>;
}
