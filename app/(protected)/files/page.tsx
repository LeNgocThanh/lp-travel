import { FilesManager } from "@/components/files-manager";
import { requireUser } from "@/lib/auth";

export default async function FilesPage() {
  // Chặn ngay ở server, trước khi render bất kỳ thứ gì
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">
      <FilesManager />
    </div>
  );
}
