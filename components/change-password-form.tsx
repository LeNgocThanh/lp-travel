"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return <form action={action} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="currentPassword">Mật khẩu hiện tại</Label><Input id="currentPassword" name="currentPassword" type="password" required /></div>
    <div className="space-y-2"><Label htmlFor="newPassword">Mật khẩu mới</Label><Input id="newPassword" name="newPassword" type="password" minLength={8} required /></div>
    <div className="space-y-2"><Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label><Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required /></div>
    {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
    {state?.success && <Alert><AlertDescription>{state.success}</AlertDescription></Alert>}
    <Button type="submit" disabled={pending}>{pending ? "Đang lưu..." : "Đổi mật khẩu"}</Button>
  </form>;
}
