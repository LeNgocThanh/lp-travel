import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { canAccessFolder } from "@/lib/permissions";
import { getUploaderFolders, uploaderFetchAsUser, type UploaderFolder } from "@/lib/uploader";

export class TravelFileError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function travelFolderName(value: string | null) {
  const name = value?.trim() ?? "";
  if (!name || name.length > 100 || name === "." || name === ".." || /[\\/:*?"<>|\u0000-\u001f]/.test(name)) {
    throw new TravelFileError("Tên thư mục không hợp lệ", 400);
  }
  return name;
}

export async function resolveTravelFolder(user: CurrentUser, name: string, createIfMissing = false) {
  const folders = await getUploaderFolders();
  const travel = folders.find((folder) => folder.path === "Travel");
  if (!travel) throw new TravelFileError("Không tìm thấy thư mục gốc Travel", 404);
  const path = `Travel/${name}`;
  let folder = folders.find((item) => item.path === path);
  if (!folder && createIfMissing) {
    if (!(await canAccessFolder(user, travel.id, travel.path, "canCreateFolder"))) {
      throw new TravelFileError(`Bạn không có quyền tạo thư mục ${path}`, 403);
    }
    if (!(await canAccessFolder(user, travel.id, travel.path, "canUpload"))) {
      throw new TravelFileError(`Bạn không có quyền tạo file trong thư mục ${path}`, 403);
    }
    const upstream = await uploaderFetchAsUser("/api/folders", user, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, parentId: travel.id }) });
    if (!upstream.ok) {
      const body = await upstream.json().catch(() => null) as { message?: string } | null;
      throw new TravelFileError(body?.message || `Không thể tạo thư mục ${path}`, upstream.status);
    }
    const body = await upstream.json() as { folder: UploaderFolder };
    folder = body.folder;
  }
  if (!folder) throw new TravelFileError(`Không tìm thấy thư mục ${path}`, 404);
  return folder;
}

export async function requireTravelFolderAction(user: CurrentUser, folder: UploaderFolder, action: "canUpload" | "canList" | "canRead" | "canDelete") {
  if (await canAccessFolder(user, folder.id, folder.path, action)) return;
  const labels = { canUpload: "tạo hoặc cập nhật file", canList: "xem danh sách file", canRead: "đọc file", canDelete: "xóa file" };
  throw new TravelFileError(`Bạn không có quyền ${labels[action]} trong thư mục ${folder.path}`, 403);
}

export function travelFileUrls(request: Request, folder: string, filename: string) {
  const view = new URL(`/api/travel-files/${encodeURIComponent(filename)}`, request.url);
  view.searchParams.set("folder", folder);
  const download = new URL(view); download.searchParams.set("download", "1");
  return { url: view.toString(), viewUrl: view.toString(), downloadUrl: download.toString() };
}

export function travelFileErrorResponse(error: unknown) {
  if (error instanceof TravelFileError) return Response.json({ ok: false, message: error.message }, { status: error.status });
  return Response.json({ ok: false, message: error instanceof Error ? error.message : "Không thể xử lý file" }, { status: 500 });
}
