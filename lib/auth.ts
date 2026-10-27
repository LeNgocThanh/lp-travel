import "server-only";
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";

export type CurrentUser = { id: string; fullName: string; username: string; role: "ADMIN" | "USER"; roleCode: string; roleName: string; root: boolean };

export async function authenticate(username: string, password: string): Promise<CurrentUser | null> {
  if (username === process.env.ROOT_ADMIN_USERNAME && password === process.env.ROOT_ADMIN_PASSWORD && username && password) {
    return { id: "root", fullName: "Root Administrator", username, role: "ADMIN", roleCode: "ROOT_ADMIN", roleName: "Root Administrator", root: true };
  }
  const user = await prisma.user.findUnique({ where: { username }, include: { systemRole: true } });
  if (!user || !user.active || !(await compare(password, user.passwordHash))) return null;
  return { id: user.id, fullName: user.fullName, username: user.username, role: user.systemRole.isSystemAdmin ? "ADMIN" : "USER", roleCode: user.systemRole.code, roleName: user.systemRole.name, root: false };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session) return null;
  if (session.root) return { id: "root", fullName: "Root Administrator", username: session.username, role: "ADMIN", roleCode: "ROOT_ADMIN", roleName: "Root Administrator", root: true };
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { systemRole: true } });
  if (!user || !user.active) return null;
  return { id: user.id, fullName: user.fullName, username: user.username, role: user.systemRole.isSystemAdmin ? "ADMIN" : "USER", roleCode: user.systemRole.code, roleName: user.systemRole.name, root: false };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
