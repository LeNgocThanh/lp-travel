import { apiUser, forbidden } from "@/lib/route-auth";
import { authorizeFolder } from "@/lib/permissions";
import { uploaderFetchAsUser, uploaderFileBelongsToFolder } from "@/lib/uploader";

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const folderId = new URL(request.url).searchParams.get("folderId") || "";
  if (!(await authorizeFolder(user, folderId, "canRead"))) return forbidden();
  const { filename } = await context.params;
  if (!(await uploaderFileBelongsToFolder(folderId, filename))) {
    return Response.json({ ok: false, message: "File không tồn tại trong thư mục" }, { status: 404 });
  }
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(filename)}/versions`, user);
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" } });
}

export async function POST(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const input = await request.formData();
  const folderId = String(input.get("folderId") || "");
  const file = input.get("file");
  if (!(file instanceof File)) return Response.json({ ok: false, message: "Chưa chọn file" }, { status: 400 });
  if (!(await authorizeFolder(user, folderId, "canUpload"))) return forbidden();
  const { filename } = await context.params;
  if (!(await uploaderFileBelongsToFolder(folderId, filename))) {
    return Response.json({ ok: false, message: "File không tồn tại trong thư mục" }, { status: 404 });
  }
  const form = new FormData(); form.set("file", file);
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(filename)}/versions`, user, {
    method: "POST",
    headers: { "If-Match": request.headers.get("if-match") || "" },
    body: form
  });
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" } });
}
