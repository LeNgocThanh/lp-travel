"use client";

import { useState } from "react";
import { Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  mode: "create" | "edit";
  title: string;
  description?: string;
  /**
   * Giá trị đổi khi dữ liệu được lưu thành công (edit: updatedAt, create: tổng số bản ghi).
   * Khi version đổi, dialog tự đóng. Lưu lỗi thì version không đổi nên dialog vẫn mở.
   */
  version: number;
  children: React.ReactNode; // <PartyForm ... /> render từ server
};

export function PartyDialog({ mode, title, description, version, children }: Props) {
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const open = openedAt === version;

  return (
    <>
      {mode === "create" ? (
        <Button type="button" onClick={() => setOpenedAt(version)}>
          <Plus />
          {title}
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpenedAt(version)}>
          <Eye />
          Chi tiết
        </Button>
      )}

      <Dialog open={open} onOpenChange={(next) => setOpenedAt(next ? version : null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </>
  );
}