"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,50}$/), name: z.string().trim().min(2).max(150), content: z.string().trim().min(2).max(20000) });
const data = (formData: FormData) => schema.parse({ code: formData.get("code"), name: formData.get("name"), content: formData.get("content") });
const calculationSchema = z.object({ depositPercent: z.coerce.number().min(0).max(100), depositDueDays: z.coerce.number().int().min(0).max(3650) });

export async function saveInvoiceCalculationSetting(formData: FormData) { await requireAdmin(); const value = calculationSchema.parse({ depositPercent: formData.get("depositPercent"), depositDueDays: formData.get("depositDueDays") }); await prisma.invoiceSetting.upsert({ where: { id: "default" }, create: { id: "default", ...value }, update: value }); revalidatePath("/admin/invoice-settings"); }

export async function createInvoicePaymentOption(formData: FormData) { await requireAdmin(); await prisma.invoicePaymentOption.create({ data: data(formData) }); revalidatePath("/admin/invoice-settings"); }
export async function updateInvoicePaymentOption(id: string, formData: FormData) { await requireAdmin(); await prisma.invoicePaymentOption.update({ where: { id }, data: data(formData) }); revalidatePath("/admin/invoice-settings"); }
export async function setInvoicePaymentOptionActive(id: string, active: boolean) { await requireAdmin(); await prisma.invoicePaymentOption.update({ where: { id }, data: { active } }); revalidatePath("/admin/invoice-settings"); }
