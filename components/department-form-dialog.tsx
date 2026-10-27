"use client";

import { useId, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ParentOption = { id: string; name: string; depth: number };

type Props = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  parentOptions: ParentOption[];
  defaultValues?: {
    name: string;
    code: string;
    parentId: string | null;
    description: string | null;
  };
};

export function DepartmentFormDialog({ mode, action, parentOptions, defaultValues }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const uid = useId();
  const isEdit = mode === "edit";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await action(formData);
      setOpen(false);
    });
  }

  return (
    <>
      {isEdit ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil />
          Sửa
        </Button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus />
          Thêm phòng ban
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Sửa phòng ban" : "Thêm phòng ban"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Cập nhật thông tin hoặc chuyển phòng ban sang nhánh khác."
                : "Chọn phòng ban cha để tạo phòng con, hoặc để trống nếu là cấp gốc."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-name`}>Tên phòng ban</Label>
                <Input
                  id={`${uid}-name`}
                  name="name"
                  defaultValue={defaultValues?.name}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-code`}>Mã</Label>
                <Input
                  id={`${uid}-code`}
                  name="code"
                  defaultValue={defaultValues?.code}
                  required
                  minLength={2}
                  maxLength={30}
                  pattern="[A-Za-z0-9_-]+"
                  title="Chỉ gồm chữ, số, dấu - và _"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-parent`}>Phòng ban cha</Label>
              <select
                id={`${uid}-parent`}
                name="parentId"
                defaultValue={defaultValues?.parentId ?? ""}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Cấp gốc</option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {"— ".repeat(item.depth)}
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-description`}>Mô tả</Label>
              <Input
                id={`${uid}-description`}
                name="description"
                defaultValue={defaultValues?.description ?? ""}
                maxLength={500}
                placeholder="Không bắt buộc"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo phòng ban"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}