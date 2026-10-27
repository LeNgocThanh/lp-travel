import { AdminActivity } from "@/components/admin-activity";
import { requireAdmin } from "@/lib/auth";

export default async function AdminActivityPage() {
  await requireAdmin();
  return <AdminActivity />;
}
