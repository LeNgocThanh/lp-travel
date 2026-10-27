import { apiUser, forbidden } from "@/lib/route-auth";
import { authorizeFolder } from "@/lib/permissions";
import { uploaderFetchAsUser } from "@/lib/uploader";

export async function POST(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const body = await request.json();
  const parentId = typeof body.parentId === "string" ? body.parentId : "";
  if (!(await authorizeFolder(user, parentId, "canCreateFolder"))) return forbidden();
  const upstream = await uploaderFetchAsUser("/api/folders", user, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: body.name, parentId })
  });
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
}
