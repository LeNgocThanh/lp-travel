"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workCaseScope } from "@/lib/work-case-access";
import { hasDepartmentPermission } from "@/lib/department-permissions";

function dateOrNull(value: string) { return value ? new Date(`${value}T00:00:00.000Z`) : null; }
function actorData(actor: Awaited<ReturnType<typeof requireUser>>) { return { actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName }; }
async function accessibleCase(id: string) { const actor = await requireUser(); const item = await prisma.workCase.findFirst({ where: { id, ...(await workCaseScope(actor)) }, include: { _count: { select: { travelers: true } } } }); if (!item) throw new Error("Không tìm thấy hồ sơ hoặc bạn không có quyền."); if (["COMPLETED", "CANCELLED"].includes(item.status)) throw new Error("Không thể thay đổi hồ sơ đã kết thúc."); return { actor, item }; }
async function canManage(actor: Awaited<ReturnType<typeof requireUser>>, receiverId: string, departmentId: string, permission: "canAssignTasks" | "canManageBookings") { return actor.role === "ADMIN" || receiverId === actor.id || hasDepartmentPermission(actor, departmentId, permission); }
function refresh(workCaseId: string) { revalidatePath(`/work/${workCaseId}`); revalidatePath("/tasks"); }

const bookingSchema = z.object({ workCaseItemId: z.string().min(1), supplierId: z.string().transform((value) => value || null), supplierName: z.string().trim().max(150), referenceCode: z.string().trim().max(100).transform((value) => value || null), serviceAt: z.string(), notes: z.string().trim().max(2000).transform((value) => value || null) });
export async function createBooking(workCaseId: string, formData: FormData) {
  const { actor, item } = await accessibleCase(workCaseId); if (!(await canManage(actor, item.receiverId, item.departmentId, "canManageBookings"))) throw new Error("Bạn không có quyền tạo booking."); if (!["BOOKING", "IN_PROGRESS"].includes(item.status)) throw new Error("Hồ sơ phải ở trạng thái đặt hoặc thực hiện dịch vụ."); if (item._count.travelers < 1) throw new Error("Phải có ít nhất một người đi tour trước khi tạo booking.");
  const data = bookingSchema.parse({ workCaseItemId: formData.get("workCaseItemId"), supplierId: String(formData.get("supplierId") ?? ""), supplierName: String(formData.get("supplierName") ?? ""), referenceCode: String(formData.get("referenceCode") ?? ""), serviceAt: String(formData.get("serviceAt") ?? ""), notes: String(formData.get("notes") ?? "") });
  const [line, supplier] = await Promise.all([prisma.workCaseItem.findFirst({ where: { id: data.workCaseItemId, workCaseId } }), data.supplierId ? prisma.supplier.findFirst({ where: { id: data.supplierId, active: true } }) : null]);
  if (!line || (data.supplierId && !supplier) || (!supplier && data.supplierName.length < 2)) throw new Error("Dòng nhu cầu hoặc nhà cung cấp không hợp lệ.");
  const name = supplier?.name ?? data.supplierName;
  await prisma.$transaction([prisma.serviceBooking.create({ data: { workCaseId, workCaseItemId: line.id, supplierId: supplier?.id, supplierNameSnapshot: name, referenceCode: data.referenceCode, serviceAt: dateOrNull(data.serviceAt), notes: data.notes } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "BOOKING_CREATED", summary: `Đã tạo booking với ${name}`, ...actorData(actor) } })]); refresh(workCaseId);
}

const bookingStatus = z.enum(["REQUESTED", "ON_HOLD", "CONFIRMED", "CANCELLED"]);
export async function changeBookingStatus(workCaseId: string, bookingId: string, formData: FormData) { const { actor, item } = await accessibleCase(workCaseId); if (!(await canManage(actor, item.receiverId, item.departmentId, "canManageBookings"))) throw new Error("Bạn không có quyền sửa booking."); const booking = await prisma.serviceBooking.findFirst({ where: { id: bookingId, workCaseId } }); if (!booking) throw new Error("Không tìm thấy booking."); const status = bookingStatus.parse(formData.get("status")); await prisma.$transaction([prisma.serviceBooking.update({ where: { id: bookingId }, data: { status } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "BOOKING_STATUS_CHANGED", summary: `Booking ${booking.supplierNameSnapshot}: ${booking.status} → ${status}`, ...actorData(actor) } })]); refresh(workCaseId); }

const taskSchema = z.object({ title: z.string().trim().min(2).max(200), description: z.string().trim().max(2000).transform((value) => value || null), priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]), assigneeId: z.string().min(1), startAt: z.string(), dueAt: z.string() });
export async function createWorkTask(workCaseId: string, formData: FormData) {
  const { actor, item } = await accessibleCase(workCaseId); if (!(await canManage(actor, item.receiverId, item.departmentId, "canAssignTasks"))) throw new Error("Bạn không có quyền giao việc.");
  const data = taskSchema.parse({ title: formData.get("title"), description: String(formData.get("description") ?? ""), priority: formData.get("priority"), assigneeId: formData.get("assigneeId"), startAt: String(formData.get("startAt") ?? ""), dueAt: String(formData.get("dueAt") ?? "") });
  const assignee = await prisma.user.findFirst({ where: { id: data.assigneeId, active: true, memberships: { some: { departmentId: item.departmentId } } } }); if (!assignee) throw new Error("Người được giao không thuộc phòng ban phụ trách.");
  if (data.startAt && data.dueAt && dateOrNull(data.startAt)! > dateOrNull(data.dueAt)!) throw new Error("Hạn hoàn thành phải sau ngày bắt đầu.");
  await prisma.$transaction(async (tx) => {
    const task = await tx.workTask.create({ data: { workCaseId, title: data.title, description: data.description, priority: data.priority, startAt: dateOrNull(data.startAt), dueAt: dateOrNull(data.dueAt), assignments: { create: { userId: assignee.id } } } });
    await tx.workCaseActivity.create({ data: { workCaseId, action: "TASK_CREATED", summary: `Đã giao việc “${data.title}” cho ${assignee.fullName}`, ...actorData(actor) } });
    if (assignee.id !== actor.id) await tx.notification.create({ data: { userId: assignee.id, type: "TASK_ASSIGNED", title: `Bạn được giao: ${data.title}`, body: `Hồ sơ ${item.code}`, href: `/work/${workCaseId}`, ...actorData(actor) } });
  }); refresh(workCaseId); revalidatePath("/notifications");
}

const taskStatus = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]);
export async function changeWorkTaskStatus(taskId: string, formData: FormData) {
  const actor = await requireUser();
  const task = await prisma.workTask.findUnique({ where: { id: taskId }, include: { workCase: true, assignments: true } });
  if (!task) throw new Error("Không tìm thấy công việc.");
  const status = taskStatus.parse(formData.get("status"));
  const isAssignee = task.assignments.some((item) => item.userId === actor.id);
  const canCancel = actor.role === "ADMIN" || task.workCase.receiverId === actor.id || await hasDepartmentPermission(actor, task.workCase.departmentId, "canAssignTasks");
  if (actor.role !== "ADMIN" && status === "CANCELLED" && !canCancel) throw new Error("Chỉ người tiếp nhận hồ sơ hoặc người có quyền giao việc mới được hủy công việc.");
  if (actor.role !== "ADMIN" && status !== "CANCELLED" && !isAssignee) throw new Error("Chỉ người được giao công việc mới được cập nhật trạng thái thực hiện.");
  if (actor.role !== "ADMIN" && task.status === "CANCELLED") throw new Error("Công việc đã hủy không thể thay đổi trạng thái.");
  await prisma.$transaction([prisma.workTask.update({ where: { id: taskId }, data: { status } }), prisma.workCaseActivity.create({ data: { workCaseId: task.workCaseId, action: "TASK_STATUS_CHANGED", summary: `Công việc “${task.title}”: ${task.status} → ${status}`, ...actorData(actor) } })]);
  refresh(task.workCaseId);
}

async function accessibleTask(taskId: string) {
  const actor = await requireUser();
  const task = await prisma.workTask.findFirst({ where: { id: taskId, workCase: { is: await workCaseScope(actor) } }, include: { workCase: true, assignments: true } });
  if (!task) throw new Error("Không tìm thấy công việc hoặc bạn không có quyền.");
  return { actor, task };
}

async function requireTaskManager(taskId: string) {
  const { actor, task } = await accessibleTask(taskId);
  if (!(await canManage(actor, task.workCase.receiverId, task.workCase.departmentId, "canAssignTasks"))) throw new Error("Bạn không có quyền chỉnh sửa công việc.");
  if (["COMPLETED", "CANCELLED"].includes(task.workCase.status)) throw new Error("Không thể thay đổi công việc trong hồ sơ đã kết thúc.");
  return { actor, task };
}

export async function updateWorkTask(taskId: string, formData: FormData) {
  const { actor, task } = await requireTaskManager(taskId);
  const data = taskSchema.parse({ title: formData.get("title"), description: String(formData.get("description") ?? ""), priority: formData.get("priority"), assigneeId: formData.get("assigneeId"), startAt: String(formData.get("startAt") ?? ""), dueAt: String(formData.get("dueAt") ?? "") });
  const assignee = await prisma.user.findFirst({ where: { id: data.assigneeId, active: true, memberships: { some: { departmentId: task.workCase.departmentId } } } });
  if (!assignee) throw new Error("Người được giao không thuộc phòng ban phụ trách.");
  if (data.startAt && data.dueAt && dateOrNull(data.startAt)! > dateOrNull(data.dueAt)!) throw new Error("Hạn hoàn thành phải sau ngày bắt đầu.");
  const previousAssignees = task.assignments.map((item) => item.userId);
  await prisma.$transaction(async (tx) => {
    await tx.workTask.update({ where: { id: taskId }, data: { title: data.title, description: data.description, priority: data.priority, startAt: dateOrNull(data.startAt), dueAt: dateOrNull(data.dueAt), assignments: { deleteMany: {}, create: { userId: assignee.id } } } });
    await tx.workCaseActivity.create({ data: { workCaseId: task.workCaseId, action: "TASK_UPDATED", summary: `Đã cập nhật công việc “${data.title}” và giao cho ${assignee.fullName}`, data: { taskId, previousAssignees, assigneeId: assignee.id }, ...actorData(actor) } });
    if (!previousAssignees.includes(assignee.id) && assignee.id !== actor.id) await tx.notification.create({ data: { userId: assignee.id, type: "TASK_ASSIGNED", title: `Bạn được giao: ${data.title}`, body: `Hồ sơ ${task.workCase.code}`, href: `/work/${task.workCaseId}`, ...actorData(actor) } });
  });
  refresh(task.workCaseId); revalidatePath("/notifications");
}

const taskCommentSchema = z.string().trim().min(1).max(3000);
export async function addWorkTaskComment(taskId: string, formData: FormData) {
  const { actor, task } = await accessibleTask(taskId);
  const content = taskCommentSchema.parse(formData.get("content"));
  const recipientIds = [...new Set([...task.assignments.map((item) => item.userId), task.workCase.receiverId])].filter((id) => id !== actor.id);
  await prisma.$transaction(async (tx) => {
    await tx.workTaskComment.create({ data: { workTaskId: taskId, content, ...actorData(actor) } });
    await tx.workCaseActivity.create({ data: { workCaseId: task.workCaseId, action: "TASK_COMMENTED", summary: `Đã bình luận công việc “${task.title}”`, data: { taskId }, ...actorData(actor) } });
    if (recipientIds.length) await tx.notification.createMany({ data: recipientIds.map((userId) => ({ userId, type: "TASK_COMMENTED", title: `Trao đổi mới: ${task.title}`, body: content.slice(0, 200), href: `/work/${task.workCaseId}`, ...actorData(actor) })) });
  });
  refresh(task.workCaseId); revalidatePath("/notifications");
}

const checklistTitleSchema = z.string().trim().min(1).max(300);
export async function addWorkTaskChecklistItem(taskId: string, formData: FormData) {
  const { actor, task } = await requireTaskManager(taskId);
  const title = checklistTitleSchema.parse(formData.get("title"));
  const position = await prisma.workTaskChecklistItem.count({ where: { workTaskId: taskId } });
  await prisma.$transaction([
    prisma.workTaskChecklistItem.create({ data: { workTaskId: taskId, title, position } }),
    prisma.workCaseActivity.create({ data: { workCaseId: task.workCaseId, action: "TASK_CHECKLIST_ADDED", summary: `Đã thêm mục checklist “${title}” vào công việc “${task.title}”`, data: { taskId }, ...actorData(actor) } })
  ]);
  refresh(task.workCaseId);
}

export async function toggleWorkTaskChecklistItem(taskId: string, checklistItemId: string, formData: FormData) {
  const { actor, task } = await accessibleTask(taskId);
  const isAssignee = task.assignments.some((item) => item.userId === actor.id);
  const isManager = await canManage(actor, task.workCase.receiverId, task.workCase.departmentId, "canAssignTasks");
  if (!isAssignee && !isManager) throw new Error("Bạn không có quyền cập nhật checklist.");
  const checklistItem = await prisma.workTaskChecklistItem.findFirst({ where: { id: checklistItemId, workTaskId: taskId } });
  if (!checklistItem) throw new Error("Không tìm thấy mục checklist.");
  const completed = formData.get("completed") === "true";
  await prisma.$transaction([
    prisma.workTaskChecklistItem.update({ where: { id: checklistItemId }, data: { completed, completedAt: completed ? new Date() : null, completedByType: completed ? actorData(actor).actorType : null, completedById: completed ? actor.id : null, completedByName: completed ? actor.fullName : null } }),
    prisma.workCaseActivity.create({ data: { workCaseId: task.workCaseId, action: "TASK_CHECKLIST_UPDATED", summary: `${completed ? "Hoàn tất" : "Mở lại"} mục checklist “${checklistItem.title}”`, data: { taskId, checklistItemId, completed }, ...actorData(actor) } })
  ]);
  refresh(task.workCaseId);
}

export async function deleteWorkTaskChecklistItem(taskId: string, checklistItemId: string) {
  const { actor, task } = await requireTaskManager(taskId);
  const checklistItem = await prisma.workTaskChecklistItem.findFirst({ where: { id: checklistItemId, workTaskId: taskId } });
  if (!checklistItem) throw new Error("Không tìm thấy mục checklist.");
  await prisma.$transaction([
    prisma.workTaskChecklistItem.delete({ where: { id: checklistItemId } }),
    prisma.workCaseActivity.create({ data: { workCaseId: task.workCaseId, action: "TASK_CHECKLIST_DELETED", summary: `Đã xóa mục checklist “${checklistItem.title}”`, data: { taskId, checklistItemId }, ...actorData(actor) } })
  ]);
  refresh(task.workCaseId);
}
