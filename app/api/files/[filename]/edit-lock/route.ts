import { apiUser, forbidden } from "@/lib/route-auth";
import { authorizeFolder } from "@/lib/permissions";
import { uploaderFetchAsUser, uploaderFileBelongsToFolder } from "@/lib/uploader";

async function proxy(request: Request, context: { params: Promise<{ filename: string }> }, method: "POST" | "PATCH" | "DELETE") {
  const { user, response } = await apiUser(); if (!user) return response!;
  const folderId = new URL(request.url).searchParams.get("folderId") || "";
  if (!(await authorizeFolder(user, folderId, "canRead")) || !(await authorizeFolder(user, folderId, "canUpload"))) return forbidden();
  const { filename } = await context.params;
  if (!(await uploaderFileBelongsToFolder(folderId, filename))) {
    return Response.json({ ok: false, message: "File không tồn tại trong thư mục" }, { status: 404 });
  }
  const headers = new Headers();
  const lock = request.headers.get("x-edit-lock");
  if (lock) headers.set("X-Edit-Lock", lock);
  const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(filename)}/edit-lock`, user, { method, headers });
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: Request, context: { params: Promise<{ filename: string }> }) { return proxy(request, context, "POST"); }
export async function PATCH(request: Request, context: { params: Promise<{ filename: string }> }) { return proxy(request, context, "PATCH"); }
export async function DELETE(request: Request, context: { params: Promise<{ filename: string }> }) { return proxy(request, context, "DELETE"); }
