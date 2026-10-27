import Link from "next/link";
import { Bell } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";
import { prisma } from "@/lib/prisma";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const unreadNotifications = user.root ? 0 : await prisma.notification.count({ where: { userId: user.id, readAt: null } });

  // Đổi theo field thực tế của user (name / fullName / email...)
  const displayName = user.fullName ?? user.username ?? "User";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white lg:block">
        <SidebarNav isAdmin={isAdmin} />
      </aside>

      <div className="lg:pl-64">
        {/* Header gọn */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white/80 px-4 backdrop-blur sm:px-6">
          <MobileNav isAdmin={isAdmin} />
          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <Button nativeButton={false} render={<Link href="/notifications" />} variant="ghost" size="icon" className="relative" aria-label="Thông báo"><Bell />{unreadNotifications > 0 && <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Button>
            <AccountMenu displayName={displayName} roleName={user.roleName} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
