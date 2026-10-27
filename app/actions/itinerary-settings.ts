"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  inclusions: z.string().trim().max(30000),
  exclusions: z.string().trim().max(30000),
  notes: z.string().trim().max(30000),
});

export async function saveItineraryInformationSetting(formData: FormData) {
  await requireAdmin();
  const data = schema.parse({ inclusions: formData.get("inclusions"), exclusions: formData.get("exclusions"), notes: formData.get("notes") });
  await prisma.itineraryInformationSetting.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  revalidatePath("/admin/itinerary-settings");
}
