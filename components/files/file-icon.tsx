"use client";

import {
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { FileKind } from "@/types/file";

const ICONS: Record<FileKind, LucideIcon> = {
  folder: Folder,
  image: FileImage,
  pdf: FileType,
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  code: FileCode,
  text: FileText,
  other: FileText,
};

/** Mỗi loại có một sắc riêng để mắt nhận ra trước khi kịp đọc tên file */
const TONES: Record<FileKind, string> = {
  folder: "text-amber-500",
  image: "text-violet-500",
  pdf: "text-rose-500",
  word: "text-blue-500",
  excel: "text-emerald-600",
  powerpoint: "text-orange-500",
  video: "text-fuchsia-500",
  audio: "text-cyan-500",
  archive: "text-yellow-600",
  code: "text-sky-500",
  text: "text-slate-500",
  other: "text-muted-foreground",
};

export function FileIcon({
  kind,
  className,
  filled = false,
}: {
  kind: FileKind;
  className?: string;
  filled?: boolean;
}) {
  const Icon = ICONS[kind];
  return (
    <Icon
      className={cn(TONES[kind], className)}
      strokeWidth={1.75}
      fill={filled && kind === "folder" ? "currentColor" : "none"}
      fillOpacity={filled && kind === "folder" ? 0.15 : undefined}
      aria-hidden
    />
  );
}
