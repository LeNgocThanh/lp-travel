"use client";

import { useActionState } from "react";
import { Plane, LoaderCircle } from "lucide-react";
import { login } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return <Card className="w-full max-w-md border-white/60 bg-white/90 shadow-2xl backdrop-blur">
    <CardHeader className="space-y-4 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sky-600 text-white"><Plane /></div>
      <div><CardTitle className="text-2xl">LP Travel</CardTitle><CardDescription>Đăng nhập hệ thống quản lý tài liệu du lịch</CardDescription></div>
    </CardHeader>
    <CardContent><form action={action} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="username">Tên đăng nhập</Label><Input id="username" name="username" autoComplete="username" required /></div>
      <div className="space-y-2"><Label htmlFor="password">Mật khẩu</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending && <LoaderCircle className="animate-spin" />}Đăng nhập</Button>
    </form></CardContent>
  </Card>;
}
