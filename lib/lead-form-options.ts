import "server-only";
import { prisma } from "@/lib/prisma";

const activeNames = { where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" as const } };
export async function getLeadFormOptions() {
  const [channels, countries, leadSources, travelTypes, leadStatuses, leadQualities, preferredContacts, hotelCategories, bookingStatuses, paymentStatuses, followUpStatuses, lostReasons, mealPreferences, users] = await Promise.all([
    prisma.channel.findMany(activeNames), prisma.country.findMany(activeNames), prisma.leadSource.findMany(activeNames), prisma.travelType.findMany(activeNames), prisma.leadStatus.findMany(activeNames), prisma.leadQuality.findMany(activeNames), prisma.preferredContact.findMany(activeNames), prisma.hotelCategory.findMany(activeNames), prisma.leadBookingStatus.findMany(activeNames), prisma.paymentStatus.findMany(activeNames), prisma.followUpStatus.findMany(activeNames), prisma.lostReason.findMany(activeNames), prisma.mealPreference.findMany(activeNames), prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);
  return { channels, countries, leadSources, travelTypes, leadStatuses, leadQualities, preferredContacts, hotelCategories, bookingStatuses, paymentStatuses, followUpStatuses, lostReasons, mealPreferences, users: users.map((user) => ({ id: user.id, name: user.fullName })) };
}
