"use client";

import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AccountMenu({ displayName, roleName }: { displayName: string; roleName: string }) {
  return <DropdownMenu>
    <DropdownMenuTrigger render={<button type="button" aria-label="Mở menu tài khoản" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500" />}>
      <span className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">{displayName.charAt(0).toUpperCase()}</span>
      <span className="hidden leading-tight sm:block"><span className="block text-sm font-medium text-slate-900">{displayName}</span><span className="block text-xs text-slate-500">{roleName}</span></span>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-52">
      <DropdownMenuItem render={<Link href="/profile" />} className="py-2"><KeyRound />Đổi mật khẩu</DropdownMenuItem>
      <DropdownMenuSeparator />
      <form action={logout}><DropdownMenuItem nativeButton render={<button type="submit" />} variant="destructive" className="w-full py-2"><LogOut />Đăng xuất</DropdownMenuItem></form>
    </DropdownMenuContent>
  </DropdownMenu>;
}
