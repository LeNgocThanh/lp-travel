import { apiUser, forbidden } from "@/lib/route-auth";
import { authorizeFolder } from "@/lib/permissions";
import { uploaderFetchAsUser, uploaderFileBelongsToFolder } from "@/lib/uploader";

export async function POST(request: Request, context: { params: Promise<{ filename: string; versionId: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const body = await request.json().catch(() => null);
  const folderId = typeof body?.folderId === "string" ? body.folderId : "";
  if (!(await authorizeFolder(user, folderId, "canUpload")) || !(await authorizeFolder(user, folderId, "canRead"))) return forbidden();
  const { filename, versionId } = await context.params;
  if (!(await uploaderFileBelongsToFolder(folderId, filename))) {
    return Response.json({ ok: false, message: "File không tồn tại trong thư mục" }, { status: 404 });
  }
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(filename)}/versions/${encodeURIComponent(versionId)}/restore`, user, {
    method: "POST",
    headers: { "If-Match": request.headers.get("if-match") || "" }
  });
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" } });
}
