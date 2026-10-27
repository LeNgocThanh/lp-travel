import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/news";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = user.root ? [] : await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return <div className="space-y-5"><div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Thông báo</h1><p className="text-sm text-muted-foreground">Các cập nhật dành cho tài khoản của bạn.</p></div>{notifications.some((item) => !item.readAt) && <WorkCaseActionForm action={markAllNotificationsRead}><Button type="submit" variant="outline">Đánh dấu tất cả đã đọc</Button></WorkCaseActionForm>}</div><div className="space-y-3">{notifications.map((notification) => <Card key={notification.id} className={notification.readAt ? "opacity-70" : "border-sky-200"}><CardHeader><CardTitle className="text-base">{notification.title}</CardTitle><CardDescription>{notification.createdAt.toLocaleString("vi-VN")}{notification.actorName ? ` · ${notification.actorName}` : ""}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><div>{notification.body && <p className="text-sm">{notification.body}</p>}{notification.href && <Link href={notification.href} className="text-sm text-sky-700 underline">Mở nội dung</Link>}</div>{!notification.readAt && <WorkCaseActionForm action={markNotificationRead.bind(null, notification.id)}><Button type="submit" size="sm" variant="outline">Đã đọc</Button></WorkCaseActionForm>}</CardContent></Card>)}{!notifications.length && <p className="text-sm text-muted-foreground">Chưa có thông báo.</p>}</div></div>;
}
