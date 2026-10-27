import { apiUser, forbidden } from "@/lib/route-auth";
import { authorizeFolder } from "@/lib/permissions";
import { uploaderFetchAsUser, uploaderFileBelongsToFolder } from "@/lib/uploader";

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const params = new URL(request.url).searchParams;
  const folderId = params.get("folderId") || "";
  if (!(await authorizeFolder(user, folderId, "canRead"))) return forbidden();
  const { filename } = await context.params;
  if (!(await uploaderFileBelongsToFolder(folderId, filename))) return Response.json({ ok: false, message: "File không tồn tại trong thư mục" }, { status: 404 });
  const query = new URLSearchParams({ left: params.get("left") || "", right: params.get("right") || "" });
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(filename)}/versions/compare?${query}`, user);
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
}
