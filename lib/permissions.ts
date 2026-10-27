import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { getUploaderFolders } from "@/lib/uploader";

export type FolderAction = "canUpload" | "canList" | "canRead" | "canDelete" | "canCreateFolder";

export async function canAccessFolder(user: CurrentUser, folderId: string, folderPath: string, action: FolderAction) {
  if (user.root) return true;
  const permissions = await prisma.folderPermission.findMany({ where: { userId: user.id, [action]: true } });
  return permissions.some((permission) =>
    permission.folderId === folderId || permission.folderPath === "" || folderPath.startsWith(`${permission.folderPath}/`)
  );
}

export async function authorizeFolder(user: CurrentUser, folderId: string, action: FolderAction) {
  const folder = (await getUploaderFolders()).find((item) => item.id === folderId);
  if (!folder || !(await canAccessFolder(user, folder.id, folder.path, action))) return null;
  return folder;
}
