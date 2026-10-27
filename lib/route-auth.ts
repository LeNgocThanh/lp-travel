import type { CurrentUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";

export async function apiUser(): Promise<{ user: CurrentUser | null; response: Response | null }> {
  const user = await getCurrentUser();
  return user
    ? { user, response: null }
    : { user: null, response: Response.json({ ok: false, message: "Chưa đăng nhập" }, { status: 401 }) };
}

export function forbidden() {
  return Response.json({ ok: false, message: "Bạn không có quyền trên thư mục này" }, { status: 403 });
}
