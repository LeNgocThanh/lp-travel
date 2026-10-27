import { timingSafeEqual } from "node:crypto";
import { createCustomerFollowUpNotifications } from "@/lib/customer-follow-up-notifications";
import { createLeadTravelDateNotifications } from "@/lib/lead-travel-notifications";

function validSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBuffer = Buffer.from(expected ?? ""); const providedBuffer = Buffer.from(provided);
  if (!expected || expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

async function run(request: Request) {
  if (!validSecret(request)) return Response.json({ ok: false, message: "Không có quyền chạy tác vụ." }, { status: 401 });
  const [customerFollowUps, leadTravelDates] = await Promise.all([createCustomerFollowUpNotifications(), createLeadTravelDateNotifications()]);
  return Response.json({ ok: true, customerFollowUps, leadTravelDates });
}

export const GET = run;
export const POST = run;
