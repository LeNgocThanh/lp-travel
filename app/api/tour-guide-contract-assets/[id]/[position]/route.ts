import { apiUser } from "@/lib/route-auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";
import { uploaderFetchAsUser, uploaderFileBelongsToFolder } from "@/lib/uploader";

export async function GET(_: Request, context: { params: Promise<{ id: string; position: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  if (!(await hasResourceAction(user, "LEADS", "READ"))) return Response.json({ ok: false, message: "Bạn không có quyền xem hợp đồng." }, { status: 403 });
  const { id, position } = await context.params; if (position !== "header" && position !== "footer") return Response.json({ ok: false, message: "Vị trí ảnh không hợp lệ." }, { status: 400 });
  const item = await prisma.tourGuideContract.findUnique({ where: { id }, select: { headerImageFolderId: true, headerImageStoredName: true, headerImageMimeType: true, footerImageFolderId: true, footerImageStoredName: true, footerImageMimeType: true } });
  const folderId = position === "header" ? item?.headerImageFolderId : item?.footerImageFolderId; const storedName = position === "header" ? item?.headerImageStoredName : item?.footerImageStoredName; const mimeType = position === "header" ? item?.headerImageMimeType : item?.footerImageMimeType;
  if (!folderId || !storedName || !(await uploaderFileBelongsToFolder(folderId, storedName))) return Response.json({ ok: false, message: "Không tìm thấy ảnh hợp đồng." }, { status: 404 });
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(storedName)}`, user);
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || mimeType || "application/octet-stream", "Cache-Control": "private, no-store" } });
}
