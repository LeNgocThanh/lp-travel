"use server";

import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

export type ActionState = { error?: string; success?: string } | undefined;

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ username: z.string().min(1), password: z.string().min(1) }).safeParse({
    username: formData.get("username"), password: formData.get("password")
  });
  if (!parsed.success) return { error: "Vui lòng nhập tài khoản và mật khẩu." };
  const user = await authenticate(parsed.data.username, parsed.data.password);
  if (!user) return { error: "Tài khoản hoặc mật khẩu không đúng." };
  await createSession({ sub: user.id, username: user.username, role: user.role, root: user.root });
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const currentUser = await requireUser();
  if (currentUser.root) return { error: "Thông tin Root Admin được quản lý trong file .env." };
  const parsed = z.object({
    fullName: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự.").max(150),
    email: z.union([z.email("Email không hợp lệ."), z.literal("")]).transform((value) => value || null),
    phoneNumber: z.string().trim().max(30, "Số điện thoại không được quá 30 ký tự.").transform((value) => value || null),
    citizenId: z.union([z.string().regex(/^\d{12}$/, "CCCD phải gồm đúng 12 chữ số."), z.literal("")]).transform((value) => value || null),
  }).safeParse({
    fullName: formData.get("fullName"),
    email: String(formData.get("email") ?? "").trim(),
    phoneNumber: String(formData.get("phoneNumber") ?? "").trim(),
    citizenId: String(formData.get("citizenId") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  await prisma.user.update({ where: { id: currentUser.id }, data: parsed.data });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { success: "Đã cập nhật thông tin tài khoản." };
}

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const currentUser = await requireUser();
  if (currentUser.root) return { error: "Mật khẩu Root Admin được quản lý trong file .env." };
  const parsed = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự."),
    confirmPassword: z.string().min(1)
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  if (parsed.data.newPassword !== parsed.data.confirmPassword) return { error: "Xác nhận mật khẩu không khớp." };
  const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
  if (!user || !(await compare(parsed.data.currentPassword, user.passwordHash))) return { error: "Mật khẩu hiện tại không đúng." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(parsed.data.newPassword, 12) } });
  return { success: "Đã đổi mật khẩu." };
}
