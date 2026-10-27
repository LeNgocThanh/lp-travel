import type { CurrentUser } from "@/lib/auth";
import { apiUser } from "@/lib/route-auth";
import { resolveTravelFolder, requireTravelFolderAction, TravelFileError, travelFileErrorResponse, travelFileUrls, travelFolderName } from "@/lib/travel-files";
import { uploaderFetchAsUser } from "@/lib/uploader";

async function folderFile(user: CurrentUser, request: Request, filename: string, action: "canUpload" | "canRead" | "canDelete") {
  const name = travelFolderName(new URL(request.url).searchParams.get("folder"));
  const folder = await resolveTravelFolder(user, name);
  await requireTravelFolderAction(user, folder, action);
  const upstream = await uploaderFetchAsUser(`/api/uploads?folderId=${encodeURIComponent(folder.id)}`, user);
  if (!upstream.ok) throw new Error("Không thể kiểm tra file trong thư mục");
  const body = await upstream.json() as { files?: { storedName: string; originalName?: string; currentVersionId?: string }[] };
  const file = body.files?.find((item) => item.storedName === filename);
  if (!file) throw new TravelFileError("File không tồn tại trong thư mục", 404);
  return { name, folder, file };
}

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  try {
    const { filename } = await context.params; const decoded = decodeURIComponent(filename);
    const { file } = await folderFile(user, request, decoded, "canRead");
    const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(decoded)}`, user);
    if (!upstream.ok) return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" } });
    const download = new URL(request.url).searchParams.get("download") === "1";
    const originalName = file.originalName || decoded;
    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
    headers.set("Content-Disposition", `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    const length = upstream.headers.get("Content-Length"); if (length) headers.set("Content-Length", length);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) { return travelFileErrorResponse(error); }
}

export async function PUT(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  try {
    const { filename } = await context.params; const decoded = decodeURIComponent(filename);
    const { name, file: current } = await folderFile(user, request, decoded, "canUpload");
    const input = await request.formData(); const file = input.get("file");
    if (!(file instanceof File)) return Response.json({ ok: false, message: "Chưa chọn file" }, { status: 400 });
    if (!current.currentVersionId) return Response.json({ ok: false, message: "Không xác định được phiên bản hiện tại của file" }, { status: 409 });
    const form = new FormData(); form.set("file", file);
    const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(decoded)}/versions`, user, { method: "POST", headers: { "If-Match": current.currentVersionId }, body: form });
    const body = await upstream.json();
    if (!upstream.ok) return Response.json(body, { status: upstream.status });
    return Response.json({ ...body, filename: decoded, ...travelFileUrls(request, name, decoded) }, { status: upstream.status });
  } catch (error) { return travelFileErrorResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  try {
    const { filename } = await context.params; const decoded = decodeURIComponent(filename);
    await folderFile(user, request, decoded, "canDelete");
    const upstream = await uploaderFetchAsUser(`/api/uploads/${encodeURIComponent(decoded)}`, user, { method: "DELETE" });
    return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" } });
  } catch (error) { return travelFileErrorResponse(error); }
}
