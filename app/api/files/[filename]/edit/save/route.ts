import { apiUser, forbidden } from "@/lib/route-auth";
import { authorizeFolder } from "@/lib/permissions";
import { uploaderFetchAsUser, uploaderFileBelongsToFolder } from "@/lib/uploader";

export async function POST(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const body = await request.json().catch(() => null);
  const folderId = typeof body?.folderId === "string" ? body.folderId : "";
  if (!(await authorizeFolder(user, folderId, "canRead")) || !(await authorizeFolder(user, folderId, "canUpload"))) return forbidden();
  const { filename } = await context.params;
  if (!(await uploaderFileBelongsToFolder(folderId, filename))) return Response.json({ ok: false, message: "File không tồn tại trong thư mục" }, { status: 404 });
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(filename)}/edit/save`, user, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Edit-Lock": request.headers.get("x-edit-lock") || "",
      "If-Match": request.headers.get("if-match") || ""
    },
    body: JSON.stringify({ content: body?.content })
  });
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
}
