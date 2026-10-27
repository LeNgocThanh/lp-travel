import { apiUser } from "@/lib/route-auth";
import { resolveTravelFolder, requireTravelFolderAction, travelFileErrorResponse, travelFileUrls, travelFolderName } from "@/lib/travel-files";
import { uploaderFetchAsUser } from "@/lib/uploader";

export async function GET(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  try {
    const name = travelFolderName(new URL(request.url).searchParams.get("folder"));
    const folder = await resolveTravelFolder(user, name);
    await requireTravelFolderAction(user, folder, "canList");
    const upstream = await uploaderFetchAsUser(`/api/uploads?folderId=${encodeURIComponent(folder.id)}`, user);
    const body = await upstream.json();
    if (!upstream.ok) return Response.json(body, { status: upstream.status });
    return Response.json({ ...body, files: Array.isArray(body.files) ? body.files.map((file: { storedName: string }) => ({ ...file, ...travelFileUrls(request, name, file.storedName) })) : [] });
  } catch (error) { return travelFileErrorResponse(error); }
}

export async function POST(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  try {
    const input = await request.formData();
    const name = travelFolderName(String(input.get("folder") || new URL(request.url).searchParams.get("folder") || ""));
    const file = input.get("file");
    if (!(file instanceof File)) return Response.json({ ok: false, message: "Chưa chọn file" }, { status: 400 });
    const folder = await resolveTravelFolder(user, name, true);
    await requireTravelFolderAction(user, folder, "canUpload");
    const form = new FormData(); form.set("folderId", folder.id); form.set("file", file);
    const upstream = await uploaderFetchAsUser("/api/upload", user, { method: "POST", body: form });
    const body = await upstream.json();
    if (!upstream.ok) return Response.json(body, { status: upstream.status });
    return Response.json({ ...body, ...travelFileUrls(request, name, body.filename) }, { status: upstream.status });
  } catch (error) { return travelFileErrorResponse(error); }
}
