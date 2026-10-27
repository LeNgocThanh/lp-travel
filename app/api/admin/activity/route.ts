import { apiUser } from "@/lib/route-auth";
import { prisma } from "@/lib/prisma";
import { uploaderFetchAsUser } from "@/lib/uploader";

export async function GET(request: Request) {
  const { user, response } = await apiUser();
  if (!user) return response!;
  if (user.role !== "ADMIN") return Response.json({ ok: false, message: "Bạn không có quyền quản trị" }, { status: 403 });
  const upstream = await uploaderFetchAsUser(`/api/audit/users?${new URL(request.url).searchParams.toString()}`, user);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) {
    return Response.json(data || { ok: false, message: "Không thể tải lịch sử hoạt động" }, { status: upstream.status });
  }
  const actorIds = [...new Set((data.events as Array<{ actorId?: string | null }>).map((event) => event.actorId).filter((id): id is string => Boolean(id && id !== "root")))];
  const users = actorIds.length ? await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, fullName: true, username: true, active: true }
  }) : [];
  const usersById = new Map(users.map((item) => [item.id, item]));
  return Response.json({
    ...data,
    events: data.events.map((event: { actorId?: string | null; actorUsername?: string | null }) => ({
      ...event,
      user: event.actorId === "root"
        ? { id: "root", fullName: "Root Administrator", username: event.actorUsername || "root", active: true }
        : event.actorId ? usersById.get(event.actorId) || null : null
    }))
  });
}
