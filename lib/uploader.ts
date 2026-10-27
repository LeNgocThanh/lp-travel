import "server-only";
import crypto from "node:crypto";
import type { CurrentUser } from "@/lib/auth";

export type UploaderFolder = { id: string; name: string; path: string; parentId?: string | null };

function config() {
  const baseUrl = process.env.UPLOADER_BASE_URL?.replace(/\/$/, "");
  const token = process.env.UPLOADER_API_TOKEN;
  if (!baseUrl || !token) throw new Error("Uploader service is not configured");
  return { baseUrl, token };
}

export async function uploaderFetch(path: string, init?: RequestInit) {
  const { baseUrl, token } = config();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  return response;
}

export async function uploaderFetchAsUser(path: string, user: CurrentUser, init?: RequestInit) {
  const secret = process.env.UPLOADER_ACTOR_SIGNING_SECRET;
  const headers = new Headers(init?.headers);
  if (secret) {
    const timestamp = String(Date.now());
    const requestId = crypto.randomUUID();
    const root = String(user.root);
    const payload = [timestamp, requestId, user.id, user.username, user.roleCode, root].join("\n");
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    headers.set("X-Actor-Id", user.id);
    headers.set("X-Actor-Username", user.username);
    headers.set("X-Actor-Role", user.roleCode);
    headers.set("X-Actor-Root", root);
    headers.set("X-Actor-Timestamp", timestamp);
    headers.set("X-Request-Id", requestId);
    headers.set("X-Actor-Signature", signature);
  }
  return uploaderFetch(path, { ...init, headers });
}

export async function getUploaderFolders() {
  const folders: UploaderFolder[] = [];
  const visited = new Set<string>();
  async function visit(folderId?: string) {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    const response = await uploaderFetch(`/api/uploads${query}`);
    if (!response.ok) throw new Error("Không thể tải danh sách thư mục từ uploader");
    const data = await response.json();
    if (!visited.has(data.folder.id)) {
      visited.add(data.folder.id);
      folders.push(data.folder);
    }
    for (const folder of data.folders as UploaderFolder[]) {
      if (!visited.has(folder.id)) await visit(folder.id);
    }
  }
  await visit();
  return folders.sort((a, b) => a.path.localeCompare(b.path));
}

export async function uploaderFileBelongsToFolder(folderId: string, filename: string) {
  const response = await uploaderFetch(`/api/uploads?folderId=${encodeURIComponent(folderId)}`);
  if (!response.ok) return false;
  const data = await response.json();
  return Array.isArray(data.files) && data.files.some((file: { storedName?: string }) => file.storedName === filename);
}
