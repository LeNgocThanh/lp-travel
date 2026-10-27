"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workCaseScope } from "@/lib/work-case-access";
import { hasDepartmentPermission } from "@/lib/department-permissions";

const workCaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  departmentId: z.string().min(1), receiverId: z.string().min(1),
  customerId: z.string().trim().transform((value) => value || null),
  customerName: z.string().trim().max(150), customerPhone: z.string().trim().max(30).transform((value) => value || null),
  expectedAt: z.string().trim(), description: z.string().trim().max(5000).transform((value) => value || null)
});

function values(formData: FormData, name: string) { return formData.getAll(name).map((value) => String(value).trim()); }
function optional(value: string) { return value || null; }

export type CreateWorkCaseState = { error?: string } | undefined;

export async function createWorkCase(_: CreateWorkCaseState, formData: FormData): Promise<CreateWorkCaseState> {
  let workCaseId: string;
  try {
    workCaseId = await createWorkCaseRecord(formData);
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Vui lòng kiểm tra lại các thông tin bắt buộc." };
    return { error: error instanceof Error ? error.message : "Không thể tạo hồ sơ. Vui lòng thử lại." };
  }
  redirect(`/work/${workCaseId}`);
}

async function createWorkCaseRecord(formData: FormData) {
  const actor = await requireUser();
  const data = workCaseSchema.parse({
    title: formData.get("title"), priority: formData.get("priority"), departmentId: formData.get("departmentId"), receiverId: formData.get("receiverId"),
    customerId: String(formData.get("customerId") ?? ""), customerName: String(formData.get("customerName") ?? ""), customerPhone: String(formData.get("customerPhone") ?? ""),
    expectedAt: String(formData.get("expectedAt") ?? ""), description: String(formData.get("description") ?? "")
  });
  const [department, receiver, selectedCustomer, actorMembership] = await Promise.all([
    prisma.department.findFirst({ where: { id: data.departmentId, active: true } }),
    prisma.user.findFirst({ where: { id: data.receiverId, active: true, memberships: { some: { departmentId: data.departmentId } } } }),
    data.customerId ? prisma.customer.findFirst({ where: { id: data.customerId, active: true } }) : null,
    actor.root ? null : prisma.departmentMembership.findUnique({ where: { userId_departmentId: { userId: actor.id, departmentId: data.departmentId } } })
  ]);
  if (!department || !receiver) throw new Error("Phòng ban hoặc người tiếp nhận không hợp lệ.");
  const canManageWorkCases = await hasDepartmentPermission(actor, data.departmentId, "canManageWorkCases");
  if (actor.role !== "ADMIN" && ((!actorMembership && !canManageWorkCases) || (!canManageWorkCases && data.receiverId !== actor.id))) throw new Error("Bạn không có quyền tạo hồ sơ cho người tiếp nhận này.");
  if (data.customerId && !selectedCustomer) throw new Error("Khách hàng đã chọn không hợp lệ.");
  if (!selectedCustomer && data.customerName.length < 2) throw new Error("Vui lòng chọn hoặc nhập khách hàng chính.");
  const canAddMasterData = actor.role === "ADMIN" || canManageWorkCases;

  const productIds = values(formData, "itemProductId");
  const itemNames = values(formData, "itemName");
  const itemTypes = values(formData, "itemType");
  const itemDescriptions = values(formData, "itemDescription");
  const itemQuantities = values(formData, "itemQuantity");
  const saveItems = new Set(values(formData, "saveItemIndex"));
  if (!itemNames.length || [productIds, itemTypes, itemDescriptions, itemQuantities].some((list) => list.length !== itemNames.length)) throw new Error("Hồ sơ phải có ít nhất một dòng nhu cầu hợp lệ.");

  const selectedProducts = await prisma.product.findMany({ where: { id: { in: productIds.filter(Boolean) }, active: true } });
  const productMap = new Map(selectedProducts.map((product) => [product.id, product]));
  const items = itemNames.map((name, index) => {
    const product = productIds[index] ? productMap.get(productIds[index]) : null;
    if (productIds[index] && !product) throw new Error(`Tour/dịch vụ ở dòng ${index + 1} không hợp lệ.`);
    if (!product && name.length < 2) throw new Error(`Vui lòng chọn hoặc nhập tour/dịch vụ ở dòng ${index + 1}.`);
    const quantity = Number(itemQuantities[index]);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error(`Số lượng ở dòng ${index + 1} không hợp lệ.`);
    return { product, name: product?.name ?? name, type: product?.type ?? (itemTypes[index] || "SERVICE").toUpperCase(), description: optional(itemDescriptions[index]), quantity, save: saveItems.has(String(index)) };
  });

  const contactNames = values(formData, "contactName");
  const contactRoles = values(formData, "contactRole");
  const contactPhones = values(formData, "contactPhone");
  const contactEmails = values(formData, "contactEmail");
  const contacts = contactNames.map((name, index) => ({ name, role: optional(contactRoles[index] ?? ""), phone: optional(contactPhones[index] ?? ""), email: optional(contactEmails[index] ?? "") })).filter((contact) => contact.name);
  const travelerNames = values(formData, "travelerName");
  const travelerNotes = values(formData, "travelerNotes");
  const travelers = travelerNames.map((fullName, index) => ({ fullName, notes: optional(travelerNotes[index] ?? "") })).filter((traveler) => traveler.fullName);

  const workCase = await prisma.$transaction(async (tx) => {
    let customer = selectedCustomer;
    if (!customer && formData.has("saveCustomer") && canAddMasterData) customer = await tx.customer.create({ data: { code: `KH-${randomUUID().slice(0, 8).toUpperCase()}`, name: data.customerName, phone: data.customerPhone, partyType: "PERSON" } });
    const createdItems = [];
    for (const item of items) {
      let product = item.product;
      if (!product && item.save && canAddMasterData) product = await tx.product.create({ data: { code: `SP-${randomUUID().slice(0, 8).toUpperCase()}`, name: item.name, type: item.type, description: item.description } });
      createdItems.push({ productId: product?.id, productNameSnapshot: item.name, productTypeSnapshot: item.type, description: item.description, quantity: item.quantity });
    }
    return tx.workCase.create({ data: {
      code: `HS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`,
      title: data.title, priority: data.priority, expectedAt: data.expectedAt ? new Date(`${data.expectedAt}T00:00:00.000Z`) : null, description: data.description,
      customerId: customer?.id, customerNameSnapshot: customer?.name ?? data.customerName, customerPhoneSnapshot: customer?.phone ?? data.customerPhone,
      departmentId: department.id, receiverId: receiver.id, createdByType: actor.root ? "ROOT" : "USER", createdById: actor.id, createdByName: actor.fullName,
      items: { create: createdItems }, contacts: { create: contacts }, travelers: { create: travelers },
      activities: { create: { action: "CREATED", summary: "Đã tạo hồ sơ", actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName } }
    } });
  });
  return workCase.id;
}

const statusSchema = z.enum(["RECEIVED", "CONSULTING", "CONFIRMED", "BOOKING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]);
const transitions: Record<string, string[]> = {
  RECEIVED: ["CONSULTING", "ON_HOLD", "CANCELLED"], CONSULTING: ["CONFIRMED", "ON_HOLD", "CANCELLED"],
  CONFIRMED: ["BOOKING", "ON_HOLD", "CANCELLED"], BOOKING: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "ON_HOLD", "CANCELLED"], ON_HOLD: ["CONSULTING", "CONFIRMED", "BOOKING", "IN_PROGRESS", "CANCELLED"]
};

export async function changeWorkCaseStatus(id: string, formData: FormData) {
  const actor = await requireUser(); const nextStatus = statusSchema.parse(formData.get("status"));
  const item = await prisma.workCase.findFirst({ where: { id, ...(await workCaseScope(actor)) }, include: { _count: { select: { travelers: true } } } });
  if (!item) throw new Error("Không tìm thấy hồ sơ hoặc bạn không có quyền.");
  if (!transitions[item.status]?.includes(nextStatus)) throw new Error("Chuyển trạng thái không hợp lệ.");
  if (nextStatus === "BOOKING" && item._count.travelers < 1) throw new Error("Phải có ít nhất một người đi tour trước khi bắt đầu đặt dịch vụ.");
  await prisma.$transaction([
    prisma.workCase.update({ where: { id }, data: { status: nextStatus } }),
    prisma.workCaseActivity.create({ data: { workCaseId: id, action: "STATUS_CHANGED", summary: `Đổi trạng thái từ ${item.status} sang ${nextStatus}`, actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName, data: { from: item.status, to: nextStatus } } })
  ]);
  revalidatePath(`/work/${id}`); revalidatePath("/work");
}

export async function updateWorkCaseDetails(id: string, formData: FormData) {
  const actor = await requireUser();
  const item = await prisma.workCase.findFirst({ where: { id, ...(await workCaseScope(actor)) }, select: { id: true } });
  if (!item) throw new Error("Không tìm thấy hồ sơ hoặc bạn không có quyền.");
  const data = z.object({ title: z.string().trim().min(2).max(200), priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]), expectedAt: z.string(), description: z.string().trim().max(5000).transform((value) => value || null) }).parse({ title: formData.get("title"), priority: formData.get("priority"), expectedAt: String(formData.get("expectedAt") ?? ""), description: String(formData.get("description") ?? "") });
  await prisma.$transaction([
    prisma.workCase.update({ where: { id }, data: { title: data.title, priority: data.priority, expectedAt: data.expectedAt ? new Date(`${data.expectedAt}T00:00:00.000Z`) : null, description: data.description } }),
    prisma.workCaseActivity.create({ data: { workCaseId: id, action: "DETAILS_UPDATED", summary: "Đã cập nhật thông tin hồ sơ", actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName } })
  ]);
  revalidatePath(`/work/${id}`); revalidatePath("/work");
}

async function editableWorkCase(id: string) {
  const actor = await requireUser();
  const item = await prisma.workCase.findFirst({ where: { id, ...(await workCaseScope(actor)) }, select: { id: true, status: true } });
  if (!item) throw new Error("Không tìm thấy hồ sơ hoặc bạn không có quyền.");
  if (["COMPLETED", "CANCELLED"].includes(item.status)) throw new Error("Không thể chỉnh sửa hồ sơ đã kết thúc.");
  return { actor, item };
}

function actorActivity(actor: Awaited<ReturnType<typeof requireUser>>) {
  return { actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName };
}

const itemSchema = z.object({ productId: z.string().trim().transform((value) => value || null), name: z.string().trim().max(150), type: z.string().trim().toUpperCase().min(2).max(30), description: z.string().trim().max(2000).transform((value) => value || null), quantity: z.coerce.number().int().min(1).max(10000) });
async function parseWorkCaseItem(formData: FormData) {
  const data = itemSchema.parse({ productId: String(formData.get("productId") ?? ""), name: formData.get("name"), type: formData.get("type"), description: String(formData.get("description") ?? ""), quantity: formData.get("quantity") });
  const product = data.productId ? await prisma.product.findFirst({ where: { id: data.productId, active: true } }) : null;
  if (data.productId && !product) throw new Error("Tour/dịch vụ đã chọn không hợp lệ.");
  if (!product && data.name.length < 2) throw new Error("Vui lòng chọn hoặc nhập tour/dịch vụ.");
  return { productId: product?.id, productNameSnapshot: product?.name ?? data.name, productTypeSnapshot: product?.type ?? data.type, description: data.description, quantity: data.quantity };
}

export async function addWorkCaseItem(workCaseId: string, formData: FormData) {
  const { actor } = await editableWorkCase(workCaseId); const data = await parseWorkCaseItem(formData);
  await prisma.$transaction([prisma.workCaseItem.create({ data: { workCaseId, ...data } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "ITEM_ADDED", summary: `Đã thêm nhu cầu: ${data.productNameSnapshot}`, ...actorActivity(actor) } })]);
  revalidatePath(`/work/${workCaseId}`);
}

export async function updateWorkCaseItem(workCaseId: string, itemId: string, formData: FormData) {
  const { actor } = await editableWorkCase(workCaseId); const current = await prisma.workCaseItem.findFirst({ where: { id: itemId, workCaseId } });
  if (!current) throw new Error("Không tìm thấy dòng nhu cầu.");
  const data = await parseWorkCaseItem(formData);
  await prisma.$transaction([prisma.workCaseItem.update({ where: { id: itemId }, data }), prisma.workCaseActivity.create({ data: { workCaseId, action: "ITEM_UPDATED", summary: `Đã sửa nhu cầu: ${data.productNameSnapshot}`, ...actorActivity(actor) } })]);
  revalidatePath(`/work/${workCaseId}`);
}

export async function deleteWorkCaseItem(workCaseId: string, itemId: string) {
  const { actor } = await editableWorkCase(workCaseId); const [current, count] = await Promise.all([prisma.workCaseItem.findFirst({ where: { id: itemId, workCaseId } }), prisma.workCaseItem.count({ where: { workCaseId } })]);
  if (!current) throw new Error("Không tìm thấy dòng nhu cầu."); if (count <= 1) throw new Error("Hồ sơ phải có ít nhất một dòng nhu cầu.");
  await prisma.$transaction([prisma.workCaseItem.delete({ where: { id: itemId } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "ITEM_DELETED", summary: `Đã xóa nhu cầu: ${current.productNameSnapshot}`, ...actorActivity(actor) } })]);
  revalidatePath(`/work/${workCaseId}`);
}

const contactSchema = z.object({ name: z.string().trim().min(2).max(150), role: z.string().trim().max(100).transform((value) => value || null), phone: z.string().trim().max(30).transform((value) => value || null), email: z.union([z.email(), z.literal("")]).transform((value) => value || null) });
function parseContact(formData: FormData) { return contactSchema.parse({ name: formData.get("name"), role: String(formData.get("role") ?? ""), phone: String(formData.get("phone") ?? ""), email: String(formData.get("email") ?? "").trim() }); }

export async function addWorkCaseContact(workCaseId: string, formData: FormData) { const { actor } = await editableWorkCase(workCaseId); const data = parseContact(formData); await prisma.$transaction([prisma.workCaseContact.create({ data: { workCaseId, ...data } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "CONTACT_ADDED", summary: `Đã thêm người liên hệ: ${data.name}`, ...actorActivity(actor) } })]); revalidatePath(`/work/${workCaseId}`); }
export async function updateWorkCaseContact(workCaseId: string, contactId: string, formData: FormData) { const { actor } = await editableWorkCase(workCaseId); const current = await prisma.workCaseContact.findFirst({ where: { id: contactId, workCaseId } }); if (!current) throw new Error("Không tìm thấy người liên hệ."); const data = parseContact(formData); await prisma.$transaction([prisma.workCaseContact.update({ where: { id: contactId }, data }), prisma.workCaseActivity.create({ data: { workCaseId, action: "CONTACT_UPDATED", summary: `Đã sửa người liên hệ: ${data.name}`, ...actorActivity(actor) } })]); revalidatePath(`/work/${workCaseId}`); }
export async function deleteWorkCaseContact(workCaseId: string, contactId: string) { const { actor } = await editableWorkCase(workCaseId); const current = await prisma.workCaseContact.findFirst({ where: { id: contactId, workCaseId } }); if (!current) throw new Error("Không tìm thấy người liên hệ."); await prisma.$transaction([prisma.workCaseContact.delete({ where: { id: contactId } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "CONTACT_DELETED", summary: `Đã xóa người liên hệ: ${current.name}`, ...actorActivity(actor) } })]); revalidatePath(`/work/${workCaseId}`); }

const travelerSchema = z.object({ fullName: z.string().trim().min(2).max(150), notes: z.string().trim().max(1000).transform((value) => value || null) });
function parseTraveler(formData: FormData) { return travelerSchema.parse({ fullName: formData.get("fullName"), notes: String(formData.get("notes") ?? "") }); }
export async function addWorkCaseTraveler(workCaseId: string, formData: FormData) { const { actor } = await editableWorkCase(workCaseId); const data = parseTraveler(formData); await prisma.$transaction([prisma.workCaseTraveler.create({ data: { workCaseId, ...data } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "TRAVELER_ADDED", summary: `Đã thêm người đi tour: ${data.fullName}`, ...actorActivity(actor) } })]); revalidatePath(`/work/${workCaseId}`); }
export async function updateWorkCaseTraveler(workCaseId: string, travelerId: string, formData: FormData) { const { actor } = await editableWorkCase(workCaseId); const current = await prisma.workCaseTraveler.findFirst({ where: { id: travelerId, workCaseId } }); if (!current) throw new Error("Không tìm thấy người đi tour."); const data = parseTraveler(formData); await prisma.$transaction([prisma.workCaseTraveler.update({ where: { id: travelerId }, data }), prisma.workCaseActivity.create({ data: { workCaseId, action: "TRAVELER_UPDATED", summary: `Đã sửa người đi tour: ${data.fullName}`, ...actorActivity(actor) } })]); revalidatePath(`/work/${workCaseId}`); }
export async function deleteWorkCaseTraveler(workCaseId: string, travelerId: string) { const { actor, item } = await editableWorkCase(workCaseId); const [current, count] = await Promise.all([prisma.workCaseTraveler.findFirst({ where: { id: travelerId, workCaseId } }), prisma.workCaseTraveler.count({ where: { workCaseId } })]); if (!current) throw new Error("Không tìm thấy người đi tour."); if (["BOOKING", "IN_PROGRESS"].includes(item.status) && count <= 1) throw new Error("Không thể xóa người đi tour cuối cùng khi hồ sơ đang đặt hoặc thực hiện dịch vụ."); await prisma.$transaction([prisma.workCaseTraveler.delete({ where: { id: travelerId } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "TRAVELER_DELETED", summary: `Đã xóa người đi tour: ${current.fullName}`, ...actorActivity(actor) } })]); revalidatePath(`/work/${workCaseId}`); }
