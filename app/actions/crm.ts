"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { customerScope } from "@/lib/crm-access";
import { departmentIdsWithPermission } from "@/lib/department-permissions";
import { prisma } from "@/lib/prisma";
import { workCaseScope } from "@/lib/work-case-access";

const actorData = (actor: Awaited<ReturnType<typeof requireUser>>) => ({ actorType: actor.root ? "ROOT" : "USER", actorId: actor.id, actorName: actor.fullName });
async function manageableCustomer(id: string) { const actor = await requireUser(); const customer = await prisma.customer.findFirst({ where: { id, ...(await customerScope(actor, true)) }, include: { owner: true } }); if (!customer) throw new Error("Không tìm thấy khách hàng hoặc bạn không có quyền quản lý."); return { actor, customer }; }
function refresh(id: string) { revalidatePath("/customers"); revalidatePath(`/customers/${id}`); revalidatePath("/admin/customers"); }
const normalizedPhone = (value: string | null) => value?.replace(/\D/g, "") || null;
const normalizedEmail = (value: string | null) => value?.trim().toLowerCase() || null;
const normalizedTaxId = (value: string | null) => value?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || null;

export async function createCrmCustomer(formData: FormData) {
  const actor = await requireUser(); const managedIds = await departmentIdsWithPermission(actor, "canManageCustomers");
  if (actor.role !== "ADMIN" && !managedIds?.length) throw new Error("Bạn không có quyền tạo khách hàng CRM.");
  const data = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/), name: z.string().trim().min(2).max(150), partyType: z.enum(["PERSON", "ORGANIZATION"]), phone: z.string().trim().max(30).transform((v) => v || null), whatsapp: z.string().trim().max(30).transform((v) => v || null), email: z.union([z.email(), z.literal("")]).transform((v) => v || null), country: z.string().trim().max(100).transform((v) => v || null), taxId: z.string().trim().max(30).transform((v) => v || null), lifecycle: z.enum(["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"]), source: z.string().trim().max(100).transform((v) => v || null), lastContactAt: z.string().transform((v) => v || null), dateReceived: z.string().transform((v) => v || null) }).parse({ code: formData.get("code"), name: formData.get("name"), partyType: formData.get("partyType"), phone: String(formData.get("phone") ?? ""), whatsapp: String(formData.get("whatsapp") ?? ""), email: String(formData.get("email") ?? "").trim(), country: String(formData.get("country") ?? ""), taxId: String(formData.get("taxId") ?? ""), lifecycle: formData.get("lifecycle"), source: String(formData.get("source") ?? ""), lastContactAt: String(formData.get("lastContactAt") ?? ""), dateReceived: String(formData.get("dateReceived") ?? "") });
  const customer = await prisma.customer.create({ data: { ...data, lastContactAt: data.lastContactAt ? new Date(`${data.lastContactAt}T00:00:00.000Z`) : null, dateReceived: data.dateReceived ? new Date(`${data.dateReceived}T00:00:00.000Z`) : null, ownerId: actor.root ? null : actor.id } }); refresh(customer.id);
}

export async function updateCustomerCrm(id: string, formData: FormData) {
  const { actor, customer } = await manageableCustomer(id);
  const data = z.object({ lifecycle: z.enum(["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"]), source: z.string().trim().max(100).transform((v) => v || null), ownerId: z.string().transform((v) => v || null), reason: z.string().trim().max(500).transform((v) => v || null) }).parse({ lifecycle: formData.get("lifecycle"), source: String(formData.get("source") ?? ""), ownerId: String(formData.get("ownerId") ?? ""), reason: String(formData.get("reason") ?? "") });
  const owner = data.ownerId ? await prisma.user.findFirst({ where: { id: data.ownerId, active: true } }) : null;
  if (data.ownerId && !owner) throw new Error("Nhân viên phụ trách không hợp lệ.");
  await prisma.$transaction(async (tx) => { await tx.customer.update({ where: { id }, data: { lifecycle: data.lifecycle, source: data.source, ownerId: owner?.id ?? null } }); if (customer.ownerId !== (owner?.id ?? null)) await tx.customerAssignmentHistory.create({ data: { customerId: id, previousOwnerId: customer.ownerId, previousOwnerName: customer.owner?.fullName, newOwnerId: owner?.id, newOwnerName: owner?.fullName, reason: data.reason, ...actorData(actor) } }); }); refresh(id);
}

export async function addCustomerInteraction(id: string, formData: FormData) {
  const { actor } = await manageableCustomer(id);
  const data = z.object({ type: z.enum(["CALL", "EMAIL", "MEETING", "MESSAGE", "NOTE"]), happenedAt: z.string().min(1), summary: z.string().trim().min(2).max(3000), outcome: z.string().trim().max(2000).transform((v) => v || null), nextFollowUpAt: z.string().transform((v) => v || null), workCaseId: z.string().transform((v) => v || null) }).parse({ type: formData.get("type"), happenedAt: formData.get("happenedAt"), summary: formData.get("summary"), outcome: String(formData.get("outcome") ?? ""), nextFollowUpAt: String(formData.get("nextFollowUpAt") ?? ""), workCaseId: String(formData.get("workCaseId") ?? "") });
  if (data.workCaseId && !(await prisma.workCase.findFirst({ where: { id: data.workCaseId, customerId: id }, select: { id: true } }))) throw new Error("Hồ sơ liên kết không thuộc khách hàng này.");
  const happenedAt = new Date(data.happenedAt); const nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null;
  await prisma.$transaction([prisma.customerInteraction.create({ data: { customerId: id, workCaseId: data.workCaseId, type: data.type, happenedAt, summary: data.summary, outcome: data.outcome, nextFollowUpAt, ...actorData(actor) } }), prisma.customer.update({ where: { id }, data: { lastContactAt: happenedAt, nextFollowUpAt } })]); refresh(id);
}

export async function addCustomerContact(id: string, formData: FormData) {
  await manageableCustomer(id);
  const data = z.object({ name: z.string().trim().min(2).max(150), role: z.string().trim().max(100).transform((v) => v || null), phone: z.string().trim().max(30).transform((v) => v || null), email: z.union([z.email(), z.literal("")]).transform((v) => v || null), notes: z.string().trim().max(1000).transform((v) => v || null), isPrimary: z.boolean() }).parse({ name: formData.get("name"), role: String(formData.get("role") ?? ""), phone: String(formData.get("phone") ?? ""), email: String(formData.get("email") ?? "").trim(), notes: String(formData.get("notes") ?? ""), isPrimary: formData.has("isPrimary") });
  await prisma.$transaction(async (tx) => { if (data.isPrimary) await tx.customerContact.updateMany({ where: { customerId: id }, data: { isPrimary: false } }); await tx.customerContact.create({ data: { customerId: id, ...data } }); }); refresh(id);
}

export async function updateCustomerContact(customerId: string, contactId: string, formData: FormData) {
  await manageableCustomer(customerId);
  const contact = await prisma.customerContact.findFirst({ where: { id: contactId, customerId } }); if (!contact) throw new Error("Không tìm thấy người liên hệ.");
  const data = z.object({ name: z.string().trim().min(2).max(150), role: z.string().trim().max(100).transform((v) => v || null), phone: z.string().trim().max(30).transform((v) => v || null), email: z.union([z.email(), z.literal("")]).transform((v) => v || null), notes: z.string().trim().max(1000).transform((v) => v || null), isPrimary: z.boolean() }).parse({ name: formData.get("name"), role: String(formData.get("role") ?? ""), phone: String(formData.get("phone") ?? ""), email: String(formData.get("email") ?? "").trim(), notes: String(formData.get("notes") ?? ""), isPrimary: formData.has("isPrimary") });
  await prisma.$transaction(async (tx) => { if (data.isPrimary) await tx.customerContact.updateMany({ where: { customerId }, data: { isPrimary: false } }); await tx.customerContact.update({ where: { id: contactId }, data }); }); refresh(customerId);
}

export async function setCustomerContactActive(customerId: string, contactId: string, active: boolean) { await manageableCustomer(customerId); await prisma.customerContact.updateMany({ where: { id: contactId, customerId }, data: { active, isPrimary: active ? undefined : false } }); refresh(customerId); }

export async function updateCustomerInteraction(customerId: string, interactionId: string, formData: FormData) {
  const { actor } = await manageableCustomer(customerId); const interaction = await prisma.customerInteraction.findFirst({ where: { id: interactionId, customerId } }); if (!interaction) throw new Error("Không tìm thấy lịch sử chăm sóc.");
  const data = z.object({ summary: z.string().trim().min(2).max(3000), outcome: z.string().trim().max(2000).transform((v) => v || null), nextFollowUpAt: z.string().transform((v) => v || null) }).parse({ summary: formData.get("summary"), outcome: String(formData.get("outcome") ?? ""), nextFollowUpAt: String(formData.get("nextFollowUpAt") ?? "") });
  const nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null;
  await prisma.$transaction([prisma.customerInteractionRevision.create({ data: { interactionId, previousData: { summary: interaction.summary, outcome: interaction.outcome, nextFollowUpAt: interaction.nextFollowUpAt?.toISOString() ?? null }, ...actorData(actor) } }), prisma.customerInteraction.update({ where: { id: interactionId }, data: { ...data, nextFollowUpAt } }), prisma.customer.update({ where: { id: customerId }, data: { nextFollowUpAt } })]); refresh(customerId);
}

export async function linkWorkCaseToCustomer(customerId: string, workCaseId: string) {
  const actor = await requireUser(); const customer = await prisma.customer.findFirst({ where: { id: customerId, ...(await customerScope(actor, true)) } }); if (!customer) throw new Error("Bạn không có quyền quản lý khách hàng.");
  const workCase = await prisma.workCase.findFirst({ where: { id: workCaseId, customerId: null, ...(await workCaseScope(actor)) } }); if (!workCase) throw new Error("Không tìm thấy hồ sơ nhập nhanh hoặc bạn không có quyền.");
  await prisma.$transaction([prisma.workCase.update({ where: { id: workCaseId }, data: { customerId } }), prisma.workCaseActivity.create({ data: { workCaseId, action: "CUSTOMER_LINKED", summary: `Đã liên kết hồ sơ với khách hàng ${customer.name}`, ...actorData(actor) } })]); refresh(customerId); revalidatePath(`/work/${workCaseId}`);
}

export async function requestCustomerMerge(sourceCustomerId: string, targetCustomerId: string) {
  if (sourceCustomerId === targetCustomerId) throw new Error("Không thể hợp nhất một khách hàng với chính họ.");
  const actor = await requireUser(); const scope = await customerScope(actor, true);
  const customers = await prisma.customer.findMany({ where: { id: { in: [sourceCustomerId, targetCustomerId] }, active: true, ...scope } });
  if (customers.length !== 2) throw new Error("Không tìm thấy khách hàng hoặc bạn không có quyền hợp nhất.");
  const source = customers.find((item) => item.id === sourceCustomerId)!; const target = customers.find((item) => item.id === targetCustomerId)!;
  const matchedFields = [normalizedPhone(source.phone) && normalizedPhone(source.phone) === normalizedPhone(target.phone) ? "phone" : null, normalizedEmail(source.email) && normalizedEmail(source.email) === normalizedEmail(target.email) ? "email" : null, normalizedTaxId(source.taxId) && normalizedTaxId(source.taxId) === normalizedTaxId(target.taxId) ? "taxId" : null].filter((item): item is string => !!item);
  if (!matchedFields.length) throw new Error("Hai khách hàng không còn thông tin trùng khớp.");
  const existing = await prisma.customerMergeReview.findFirst({ where: { status: "PENDING", OR: [{ sourceCustomerId, targetCustomerId }, { sourceCustomerId: targetCustomerId, targetCustomerId: sourceCustomerId }] } });
  if (existing) throw new Error("Cặp khách hàng này đã có đề xuất đang chờ xác nhận.");
  await prisma.customerMergeReview.create({ data: { sourceCustomerId, targetCustomerId, matchedFields, requestedByType: actor.root ? "ROOT" : "USER", requestedById: actor.id, requestedByName: actor.fullName } });
  revalidatePath("/customers/follow-ups");
}

export async function reviewCustomerMerge(reviewId: string, decision: "MERGED" | "REJECTED", formData: FormData) {
  const actor = await requireUser(); const reviewNote = z.string().trim().max(1000).transform((value) => value || null).parse(String(formData.get("reviewNote") ?? ""));
  const review = await prisma.customerMergeReview.findUnique({ where: { id: reviewId }, include: { sourceCustomer: true, targetCustomer: true } });
  if (!review || review.status !== "PENDING") throw new Error("Đề xuất không tồn tại hoặc đã được xử lý.");
  const scope = await customerScope(actor, true); const allowed = await prisma.customer.count({ where: { id: { in: [review.sourceCustomerId, review.targetCustomerId] }, ...scope } });
  if (allowed !== 2) throw new Error("Bạn không có quyền xác nhận hợp nhất hai khách hàng này.");
  const reviewer = actor.root ? null : actor.id; const reviewedAt = new Date();
  await prisma.$transaction(async (tx) => {
    if (decision === "MERGED") {
      if (!review.sourceCustomer.active || !review.targetCustomer.active) throw new Error("Một trong hai khách hàng đã được lưu trữ.");
      await tx.workCase.updateMany({ where: { customerId: review.sourceCustomerId }, data: { customerId: review.targetCustomerId } });
      await tx.customerContact.updateMany({ where: { customerId: review.sourceCustomerId }, data: { customerId: review.targetCustomerId, isPrimary: false } });
      await tx.customerInteraction.updateMany({ where: { customerId: review.sourceCustomerId }, data: { customerId: review.targetCustomerId } });
      await tx.customerAssignmentHistory.updateMany({ where: { customerId: review.sourceCustomerId }, data: { customerId: review.targetCustomerId } });
      await tx.customer.update({ where: { id: review.targetCustomerId }, data: { phone: review.targetCustomer.phone ?? review.sourceCustomer.phone, whatsapp: review.targetCustomer.whatsapp ?? review.sourceCustomer.whatsapp, email: review.targetCustomer.email ?? review.sourceCustomer.email, country: review.targetCustomer.country ?? review.sourceCustomer.country, taxId: review.targetCustomer.taxId ?? review.sourceCustomer.taxId, dateReceived: !review.targetCustomer.dateReceived || (review.sourceCustomer.dateReceived && review.sourceCustomer.dateReceived < review.targetCustomer.dateReceived) ? review.sourceCustomer.dateReceived : review.targetCustomer.dateReceived, lastContactAt: !review.targetCustomer.lastContactAt || (review.sourceCustomer.lastContactAt && review.sourceCustomer.lastContactAt > review.targetCustomer.lastContactAt) ? review.sourceCustomer.lastContactAt : review.targetCustomer.lastContactAt, nextFollowUpAt: !review.targetCustomer.nextFollowUpAt || (review.sourceCustomer.nextFollowUpAt && review.sourceCustomer.nextFollowUpAt < review.targetCustomer.nextFollowUpAt) ? review.sourceCustomer.nextFollowUpAt : review.targetCustomer.nextFollowUpAt } });
      await tx.customer.update({ where: { id: review.sourceCustomerId }, data: { active: false, lifecycle: "INACTIVE", ownerId: null, nextFollowUpAt: null } });
      await tx.customerMergeReview.updateMany({ where: { id: { not: review.id }, status: "PENDING", OR: [{ sourceCustomerId: review.sourceCustomerId }, { targetCustomerId: review.sourceCustomerId }] }, data: { status: "REJECTED", reviewedById: reviewer, reviewedByName: actor.fullName, reviewNote: "Tự động đóng vì khách hàng đã được hợp nhất.", reviewedAt } });
    }
    await tx.customerMergeReview.update({ where: { id: review.id }, data: { status: decision, reviewedById: reviewer, reviewedByName: actor.fullName, reviewNote, reviewedAt } });
  });
  refresh(review.targetCustomerId); revalidatePath("/customers/follow-ups"); revalidatePath("/notifications");
}

async function requireCustomerClassificationManager() {
  const actor = await requireUser(); const managedIds = await departmentIdsWithPermission(actor, "canManageCustomers");
  if (actor.role !== "ADMIN" && !managedIds?.length) throw new Error("Bạn không có quyền quản lý phân nhóm khách hàng.");
  return actor;
}

export async function createCustomerTag(formData: FormData) {
  await requireCustomerClassificationManager();
  const data = z.object({ name: z.string().trim().min(2).max(60), color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal("")).transform((value) => value || null) }).parse({ name: formData.get("name"), color: String(formData.get("color") ?? "") });
  await prisma.customerTag.create({ data }); revalidatePath("/customers/classification");
}

export async function createCustomerSegment(formData: FormData) {
  await requireCustomerClassificationManager();
  const data = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(500).transform((value) => value || null) }).parse({ name: formData.get("name"), description: String(formData.get("description") ?? "") });
  await prisma.customerSegment.create({ data }); revalidatePath("/customers/classification");
}

export async function setCustomerTagActive(id: string, active: boolean) { await requireCustomerClassificationManager(); await prisma.customerTag.update({ where: { id }, data: { active } }); revalidatePath("/customers/classification"); }
export async function setCustomerSegmentActive(id: string, active: boolean) { await requireCustomerClassificationManager(); await prisma.customerSegment.update({ where: { id }, data: { active } }); revalidatePath("/customers/classification"); }

export async function classifyCustomer(customerId: string, formData: FormData) {
  await manageableCustomer(customerId);
  const segmentId = String(formData.get("segmentId") ?? "") || null; const tagIds = [...new Set(formData.getAll("tagId").map(String))];
  if (segmentId && !(await prisma.customerSegment.findFirst({ where: { id: segmentId, active: true } }))) throw new Error("Nhóm khách hàng không hợp lệ.");
  if (tagIds.length !== await prisma.customerTag.count({ where: { id: { in: tagIds }, active: true } })) throw new Error("Có tag không hợp lệ.");
  await prisma.$transaction(async (tx) => { await tx.customer.update({ where: { id: customerId }, data: { segmentId } }); await tx.customerTagAssignment.deleteMany({ where: { customerId } }); if (tagIds.length) await tx.customerTagAssignment.createMany({ data: tagIds.map((tagId) => ({ customerId, tagId })) }); });
  refresh(customerId); revalidatePath("/customers/classification"); revalidatePath("/customers/reports");
}
