import { apiUser } from "@/lib/route-auth";
import { prisma } from "@/lib/prisma";
import { uploaderFetchAsUser, uploaderFileBelongsToFolder } from "@/lib/uploader";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser();
  if (!user) return response!;
  const { id } = await context.params;
  const template = await prisma.documentTemplate.findUnique({ where: { id }, select: { imageFolderId: true, imageStoredName: true, imageMimeType: true } });
  if (!template?.imageFolderId || !template.imageStoredName || !(await uploaderFileBelongsToFolder(template.imageFolderId, template.imageStoredName))) return Response.json({ ok: false, message: "Không tìm thấy ảnh template." }, { status: 404 });
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(template.imageStoredName)}`, user);
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || template.imageMimeType || "application/octet-stream", "Cache-Control": "private, no-store" } });
}
