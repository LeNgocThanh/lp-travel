import { apiUser } from "@/lib/route-auth";
import { prisma } from "@/lib/prisma";
import { getUploaderFolders } from "@/lib/uploader";

const actions = ["canUpload", "canList", "canRead", "canDelete", "canCreateFolder"] as const;
type FolderWithRights = Awaited<ReturnType<typeof getUploaderFolders>>[number] & Record<(typeof actions)[number], boolean>;

export async function GET() {
  const { user, response } = await apiUser();
  if (!user) return response!;
  const [folders, permissions] = await Promise.all([
    getUploaderFolders(), user.root ? Promise.resolve([]) : prisma.folderPermission.findMany({ where: { userId: user.id } })
  ]);
  const visible = folders.map((folder): FolderWithRights => {
    const rights = Object.fromEntries(actions.map((action) => [action, user.root || permissions.some((permission) =>
      permission[action] && (permission.folderId === folder.id || permission.folderPath === "" || folder.path.startsWith(`${permission.folderPath}/`))
    )]));
    return { ...folder, ...rights } as FolderWithRights;
  }).filter((folder) => actions.some((action) => folder[action]));
  return Response.json({ ok: true, folders: visible });
}
