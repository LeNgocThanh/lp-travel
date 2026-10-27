"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { expandDepartmentDescendants, manageableNewsDepartmentIds, newsPostScope } from "@/lib/news-access";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({ title: z.string().trim().min(2).max(200), body: z.string().trim().min(2).max(20000), audienceType: z.enum(["ALL", "DEPARTMENTS"]), status: z.enum(["DRAFT", "PUBLISHED"]) });
const actorData = (actor: Awaited<ReturnType<typeof requireUser>>) => ({ actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName });
const authorData = (actor: Awaited<ReturnType<typeof requireUser>>) => ({ authorType: actor.root ? "ROOT" : "USER", authorId: actor.id, authorName: actor.fullName });

async function notificationRecipients(audienceType: "ALL" | "DEPARTMENTS", departmentIds: string[]) {
  if (audienceType === "ALL") return prisma.user.findMany({ where: { active: true }, select: { id: true } });
  const departments = await prisma.department.findMany({ select: { id: true, parentId: true } });
  const expandedIds = expandDepartmentDescendants(departments, departmentIds);
  return prisma.user.findMany({ where: { active: true, memberships: { some: { departmentId: { in: expandedIds } } } }, select: { id: true } });
}

export async function createPost(formData: FormData) {
  const actor = await requireUser();
  const data = postSchema.parse({ title: formData.get("title"), body: formData.get("body"), audienceType: formData.get("audienceType"), status: formData.get("status") });
  const departmentIds = formData.getAll("departmentId").map(String);
  const manageableIds = await manageableNewsDepartmentIds(actor);
  if (data.audienceType === "ALL" && actor.role !== "ADMIN") throw new Error("Chỉ Admin được đăng tin toàn công ty.");
  if (data.audienceType === "DEPARTMENTS" && !departmentIds.length) throw new Error("Vui lòng chọn ít nhất một phòng ban.");
  if (manageableIds && departmentIds.some((id) => !manageableIds.includes(id))) throw new Error("Bạn không có quyền đăng tin cho phòng ban đã chọn.");
  const recipients = data.status === "PUBLISHED" ? await notificationRecipients(data.audienceType, departmentIds) : [];
  await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({ data: { title: data.title, body: data.body, audienceType: data.audienceType, status: data.status, publishedAt: data.status === "PUBLISHED" ? new Date() : null, ...authorData(actor), audiences: data.audienceType === "DEPARTMENTS" ? { create: departmentIds.map((departmentId) => ({ departmentId })) } : undefined } });
    if (recipients.length) await tx.notification.createMany({ data: recipients.filter((user) => user.id !== actor.id).map((user) => ({ userId: user.id, type: "POST_PUBLISHED", title: data.title, body: "Có bài viết mới trên bảng tin nội bộ.", href: `/news/${post.id}`, ...actorData(actor) })) });
  });
  revalidatePath("/news"); revalidatePath("/notifications");
}

async function editablePost(id: string) {
  const actor = await requireUser();
  const post = await prisma.post.findUnique({ where: { id }, include: { audiences: true } });
  if (!post || (actor.role !== "ADMIN" && post.authorId !== actor.id)) throw new Error("Bạn không có quyền chỉnh sửa bài viết này.");
  return { actor, post };
}

export async function publishPost(id: string) {
  const { actor, post } = await editablePost(id);
  if (post.status !== "DRAFT") throw new Error("Chỉ bài nháp mới có thể đăng.");
  const manageableIds = await manageableNewsDepartmentIds(actor);
  if (post.audienceType === "ALL" && actor.role !== "ADMIN") throw new Error("Chỉ Admin được đăng tin toàn công ty.");
  if (manageableIds && post.audiences.some((item) => !manageableIds.includes(item.departmentId))) throw new Error("Bạn không còn quyền đăng tin cho phòng ban đã chọn.");
  const recipients = await notificationRecipients(post.audienceType, post.audiences.map((item) => item.departmentId));
  await prisma.$transaction(async (tx) => {
    await tx.post.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    if (recipients.length) await tx.notification.createMany({ data: recipients.filter((user) => user.id !== actor.id).map((user) => ({ userId: user.id, type: "POST_PUBLISHED", title: post.title, body: "Có bài viết mới trên bảng tin nội bộ.", href: `/news/${post.id}`, ...actorData(actor) })) });
  });
  revalidatePath("/news"); revalidatePath(`/news/${id}`); revalidatePath("/notifications");
}

export async function updatePostContent(id: string, formData: FormData) {
  const { post } = await editablePost(id);
  if (post.status === "ARCHIVED") throw new Error("Không thể sửa bài viết đã lưu trữ.");
  const data = z.object({ title: z.string().trim().min(2).max(200), body: z.string().trim().min(2).max(20000) }).parse({ title: formData.get("title"), body: formData.get("body") });
  await prisma.post.update({ where: { id }, data });
  revalidatePath("/news"); revalidatePath(`/news/${id}`);
}

export async function setPostPinned(id: string, pinned: boolean) { const { actor } = await editablePost(id); if (actor.role !== "ADMIN") throw new Error("Chỉ Admin được ghim bài viết."); await prisma.post.update({ where: { id }, data: { pinnedAt: pinned ? new Date() : null } }); revalidatePath("/news"); revalidatePath(`/news/${id}`); }
export async function archivePost(id: string) { await editablePost(id); await prisma.post.update({ where: { id }, data: { status: "ARCHIVED", pinnedAt: null } }); revalidatePath("/news"); revalidatePath(`/news/${id}`); }

export async function addPostComment(postId: string, formData: FormData) {
  const actor = await requireUser();
  const post = await prisma.post.findFirst({ where: { id: postId, ...(await newsPostScope(actor)) } });
  if (!post || post.status !== "PUBLISHED") throw new Error("Không tìm thấy bài viết hoặc bài viết chưa được đăng.");
  const content = z.string().trim().min(1).max(3000).parse(formData.get("content"));
  await prisma.postComment.create({ data: { postId, content, ...actorData(actor) } });
  revalidatePath(`/news/${postId}`);
}

export async function markNotificationRead(id: string) { const actor = await requireUser(); if (actor.root) return; await prisma.notification.updateMany({ where: { id, userId: actor.id }, data: { readAt: new Date() } }); revalidatePath("/notifications"); }
export async function markAllNotificationsRead() { const actor = await requireUser(); if (actor.root) return; await prisma.notification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } }); revalidatePath("/notifications"); }
