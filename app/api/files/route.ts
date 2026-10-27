import { apiUser, forbidden } from "@/lib/route-auth";
import { authorizeFolder } from "@/lib/permissions";
import { uploaderFetchAsUser } from "@/lib/uploader";

export async function GET(request: Request) {
  const { user, response } = await apiUser();
  if (!user) return response!;
  const folderId = new URL(request.url).searchParams.get("folderId");
  if (!folderId || !(await authorizeFolder(user, folderId, "canList"))) return forbidden();
  const upstream = await uploaderFetchAsUser(`/api/uploads?folderId=${encodeURIComponent(folderId)}`, user);
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" } });
}

export async function POST(request: Request) {
  const { user, response } = await apiUser();
  if (!user) return response!;
  const input = await request.formData();
  const folderId = String(input.get("folderId") || "");
  const file = input.get("file");
  if (!(file instanceof File)) return Response.json({ ok: false, message: "Chưa chọn file" }, { status: 400 });
  if (!(await authorizeFolder(user, folderId, "canUpload"))) return forbidden();
  const form = new FormData(); form.set("folderId", folderId); form.set("file", file);
  const upstream = await uploaderFetchAsUser("/api/upload", user, { method: "POST", body: form });
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" } });
}
