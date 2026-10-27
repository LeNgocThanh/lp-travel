"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = { fullName: string; email: string | null; phoneNumber: string | null; citizenId: string | null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return <form action={action} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="fullName">Họ và tên</Label><Input id="fullName" name="fullName" defaultValue={profile.fullName} minLength={2} maxLength={150} required /></div>
    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={profile.email ?? ""} /></div>
    <div className="space-y-2"><Label htmlFor="phoneNumber">Số điện thoại</Label><Input id="phoneNumber" name="phoneNumber" type="tel" maxLength={30} defaultValue={profile.phoneNumber ?? ""} /></div>
    <div className="space-y-2"><Label htmlFor="citizenId">CCCD</Label><Input id="citizenId" name="citizenId" inputMode="numeric" pattern="[0-9]{12}" maxLength={12} defaultValue={profile.citizenId ?? ""} /></div>
    {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
    {state?.success && <Alert><AlertDescription>{state.success}</AlertDescription></Alert>}
    <Button type="submit" disabled={pending}>{pending ? "Đang lưu..." : "Lưu thông tin"}</Button>
  </form>;
}
