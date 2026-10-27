import type { FileItem, FileKind, Folder, SortDir, SortKey } from "@/types/file";

const EXTENSION_MAP: Record<string, FileKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  avif: "image", bmp: "image", svg: "image", ico: "image", heic: "image",
  pdf: "pdf",
  doc: "word", docx: "word", rtf: "word", odt: "word",
  xls: "excel", xlsx: "excel", csv: "excel", ods: "excel",
  ppt: "powerpoint", pptx: "powerpoint", odp: "powerpoint",
  mp4: "video", webm: "video", mov: "video", mkv: "video", avi: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", flac: "audio",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  ts: "code", tsx: "code", js: "code", jsx: "code", json: "code", html: "code",
  css: "code", scss: "code", py: "code", go: "code", rs: "code", java: "code",
  sql: "code", sh: "code", yml: "code", yaml: "code",
  txt: "text", md: "text", log: "text",
};

export function getExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function getFileKind(item: Pick<FileItem, "name" | "isFolder" | "mimeType">): FileKind {
  if (item.isFolder) return "folder";

  const byExt = EXTENSION_MAP[getExtension(item.name)];
  if (byExt) return byExt;

  const mime = item.mimeType ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

/** Loại xem được ngay trong trang, không cần tải về */
export function isPreviewable(kind: FileKind): boolean {
  return ["image", "pdf", "word", "excel", "powerpoint", "video", "audio", "text", "code"].includes(kind);
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : value >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function formatRelative(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.round(hour / 24);
  if (day < 30) return `${day} ngày trước`;
  return formatDate(iso);
}

/* ---------------- Cây thư mục dựng từ chuỗi path ---------------- */

/** "kho/hop-dong/2026" -> "kho/hop-dong" ; "kho" -> "" */
export function parentPath(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** Các thư mục nằm ngay dưới một path (path "" = gốc) */
export function childFolders(folders: Folder[], path: string): Folder[] {
  return folders
    .filter((f) => parentPath(f.path) === path)
    .sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }));
}

/**
 * Breadcrumb cho một thư mục. Tổ tiên nào user không có quyền thấy sẽ
 * trả về folder = null, hiển thị dạng chữ thường không bấm được.
 */
export function buildBreadcrumb(
  folders: Folder[],
  current: Folder,
): Array<{ label: string; folder: Folder | null }> {
  const byPath = new Map(folders.map((f) => [f.path, f]));
  const segments = current.path.split("/").filter(Boolean);

  return segments.map((segment, i) => {
    const path = segments.slice(0, i + 1).join("/");
    return { label: segment, folder: byPath.get(path) ?? null };
  });
}

/* --------------------------- Sắp xếp ---------------------------- */

export function sortItems(items: FileItem[], key: SortKey, dir: SortDir): FileItem[] {
  const factor = dir === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    // Thư mục luôn nằm trên, bất kể tiêu chí sắp xếp
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;

    switch (key) {
      case "size":
        return ((a.size ?? 0) - (b.size ?? 0)) * factor;
      case "createdAt":
        return (
          (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) * factor
        );
      case "kind": {
        const ka = getFileKind(a);
        const kb = getFileKind(b);
        if (ka === kb) return a.name.localeCompare(b.name, "vi");
        return ka.localeCompare(kb) * factor;
      }
      default:
        return a.name.localeCompare(b.name, "vi", { numeric: true }) * factor;
    }
  });
}

export const KIND_LABEL: Record<FileKind, string> = {
  folder: "Thư mục",
  image: "Hình ảnh",
  pdf: "PDF",
  word: "Tài liệu Word",
  excel: "Bảng tính",
  powerpoint: "Bản trình chiếu",
  video: "Video",
  audio: "Âm thanh",
  archive: "Tệp nén",
  code: "Mã nguồn",
  text: "Văn bản",
  other: "Tệp",
};
