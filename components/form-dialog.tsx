"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  /** Đổi giá trị này khi dữ liệu được lưu thành công thì dialog tự đóng. */
  version: string | number;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm";
  triggerClassName?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormDialog({
  title,
  description,
  version,
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
  className,
  children,
}: Props) {
  const [openedAt, setOpenedAt] = useState<string | number | null>(null);
  const open = openedAt === version;

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpenedAt(version)}
      >
        {triggerIcon}
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={(next) => setOpenedAt(next ? version : null)}>
        <DialogContent className={cn("max-h-[90vh] overflow-y-auto", className ?? "sm:max-w-lg")}>
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