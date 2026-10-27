"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  RotateCw,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/files/file-icon";
import { KIND_LABEL, formatBytes, formatDate, getFileKind } from "@/lib/file-utils";
import type { FileItem } from "@/types/file";

interface FilePreviewProps {
  file: FileItem | null;
  /** các file cùng thư mục, để bấm mũi tên qua lại */
  siblings: FileItem[];
  onClose: () => void;
  onNavigate: (file: FileItem) => void;
}

const headerLinkClass =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2.5";

/**
 * Lớp phủ xem trước tự dựng thay vì dùng Dialog của shadcn,
 * để không phụ thuộc vào phiên bản component trong dự án.
 */
export function FilePreview({ file, siblings, onClose, onNavigate }: FilePreviewProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const index = file ? siblings.findIndex((s) => s.key === file.key) : -1;
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  useEffect(() => {
    if (!file) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && prev) onNavigate(prev);
      if (event.key === "ArrowRight" && next) onNavigate(next);
    }

    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [file, prev, next, onClose, onNavigate]);

  // Đưa focus vào hộp thoại để phím tắt và đọc màn hình hoạt động đúng
  useEffect(() => {
    if (file) dialogRef.current?.focus();
  }, [file]);

  if (!file) return null;

  const kind = getFileKind(file);
  const meta = [
    KIND_LABEL[kind],
    file.size != null ? formatBytes(file.size) : null,
    file.createdAt ? formatDate(file.createdAt) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xem trước ${file.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl outline-none"
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <FileIcon kind={kind} className="size-5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
          </div>

          {file.url && (
            <div className="flex items-center gap-1">
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Mở tab mới"
                title="Mở tab mới"
                className={cn(headerLinkClass, "text-muted-foreground hover:bg-accent hover:text-foreground")}
              >
                <ExternalLink className="size-4" />
                <span className="hidden sm:inline">Mở tab mới</span>
              </a>
              <a
                href={file.downloadUrl ?? file.url}
                download={file.name}
                aria-label="Tải về"
                title="Tải về"
                className={cn(headerLinkClass, "bg-secondary font-medium text-secondary-foreground hover:bg-secondary/80")}
              >
                <Download className="size-4" />
                <span className="hidden sm:inline">Tải về</span>
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng (Esc)"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 bg-neutral-900">
          <PreviewSurface key={file.key} file={file} />

          {prev && <NavButton side="left" label="Tệp trước" onClick={() => onNavigate(prev)} />}
          {next && <NavButton side="right" label="Tệp sau" onClick={() => onNavigate(next)} />}
        </div>

        {siblings.length > 1 && (
          <footer className="flex h-9 shrink-0 items-center justify-center border-t text-xs text-muted-foreground">
            {index + 1} / {siblings.length}
          </footer>
        )}
      </div>
    </div>
  );
}

function NavButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full",
        "bg-black/50 text-white backdrop-blur transition hover:bg-black/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Chọn cách hiển thị theo loại file                                   */
/* ------------------------------------------------------------------ */

function PreviewSurface({ file }: { file: FileItem }) {
  const kind = getFileKind(file);

  if (!file.url) {
    return <Unavailable file={file} reason="Bạn không có quyền đọc file trong thư mục này." />;
  }

  switch (kind) {
    case "image":
      return <ImagePreview file={file} />;
    case "pdf":
      return (
        <object data={file.url} type="application/pdf" className="size-full">
          <Unavailable file={file} reason="Trình duyệt không mở được PDF này." />
        </object>
      );
    case "word":
      return <WordPreview file={file} />;
    case "excel":
      return <ExcelPreview file={file} />;
    case "powerpoint":
      return <Unavailable file={file} reason="File PowerPoint cần tải về để mở." />;
    case "video":
      return (
        <div className="grid size-full place-items-center p-6">
          <video src={file.url} controls className="max-h-full max-w-full rounded-lg shadow-2xl" />
        </div>
      );
    case "audio":
      return (
        <div className="grid size-full place-items-center p-6">
          <div className="w-full max-w-md rounded-xl bg-neutral-800 p-6 text-center">
            <FileIcon kind="audio" className="mx-auto mb-4 size-12" />
            <p className="mb-4 truncate text-sm text-neutral-200">{file.name}</p>
            <audio src={file.url} controls className="w-full" />
          </div>
        </div>
      );
    case "text":
    case "code":
      return <TextPreview file={file} />;
    default:
      return <Unavailable file={file} reason="Định dạng này chưa xem trực tiếp được." />;
  }
}

/* ----------------------------- Excel ------------------------------ */

const MAX_ROWS = 500;
const MAX_COLUMNS = 50;

type SheetData = { name: string; rows: string[][]; totalRows: number; totalColumns: number };

/** 0 -> A, 25 -> Z, 26 -> AA */
function columnLetter(index: number) {
  let result = "";
  let n = index + 1;
  while (n > 0) {
    const rest = (n - 1) % 26;
    result = String.fromCharCode(65 + rest) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

const looksNumeric = (text: string) => /^[-+]?[\d.,\s]+%?$/.test(text.trim()) && /\d/.test(text);

function ExcelPreview({ file }: { file: FileItem }) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const [{ default: ExcelJS }, response] = await Promise.all([import("exceljs"), fetch(file.url!)]);
        if (!response.ok) throw new Error(String(response.status));

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await response.arrayBuffer());

        const result: SheetData[] = workbook.worksheets.map((sheet) => {
          const rowCount = Math.min(sheet.rowCount, MAX_ROWS);
          const columnCount = Math.min(sheet.columnCount, MAX_COLUMNS);
          const rows = Array.from({ length: rowCount }, (_, r) => {
            const row = sheet.getRow(r + 1);
            return Array.from({ length: columnCount }, (_, c) => row.getCell(c + 1).text);
          });
          return { name: sheet.name, rows, totalRows: sheet.rowCount, totalColumns: sheet.columnCount };
        });

        if (!cancelled) {
          setSheets(result);
          setStatus("done");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (status === "loading") return <Spinner />;
  if (status === "error" || !sheets.length) {
    return <Unavailable file={file} reason="Không dựng được nội dung bảng tính này." />;
  }

  const sheet = sheets[active];
  const truncated = sheet.totalRows > MAX_ROWS || sheet.totalColumns > MAX_COLUMNS;
  const columnCount = sheet.rows[0]?.length ?? 0;

  return (
    <div className="flex size-full flex-col overflow-hidden bg-neutral-800">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/15 p-2">
        {sheets.map((item, i) => (
          <button
            key={`${item.name}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1 text-xs transition-colors",
              active === i ? "bg-white font-medium text-black" : "bg-white/10 text-white hover:bg-white/20",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <table className="border-separate border-spacing-0 bg-white text-xs text-black shadow-lg">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 w-10 border-b border-r border-neutral-300 bg-neutral-100" />
              {Array.from({ length: columnCount }, (_, c) => (
                <th
                  key={c}
                  className="sticky top-0 z-10 min-w-24 border-b border-r border-neutral-300 bg-neutral-100 px-2 py-1 text-center font-medium text-neutral-500"
                >
                  {columnLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, r) => (
              <tr key={r} className="hover:bg-sky-50">
                <td className="sticky left-0 z-10 border-b border-r border-neutral-300 bg-neutral-100 px-2 py-1 text-center text-neutral-500">
                  {r + 1}
                </td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      "max-w-80 whitespace-pre-wrap border-b border-r border-neutral-200 px-2 py-1 align-top",
                      looksNumeric(cell) && "text-right tabular-nums",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {truncated && (
          <p className="mt-3 text-center text-xs text-neutral-400">
            Chỉ hiển thị {Math.min(sheet.totalRows, MAX_ROWS)} dòng × {Math.min(sheet.totalColumns, MAX_COLUMNS)} cột đầu tiên. Tải file về để xem đầy đủ.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Ảnh ------------------------------- */

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

function ImagePreview({ file }: { file: FileItem }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const adjust = useCallback((delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z + delta).toFixed(2)))));
  }, []);

  const reset = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  // Phím tắt: + / - phóng thu, R xoay, 0 về mặc định
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "+" || event.key === "=") adjust(0.25);
      if (event.key === "-") adjust(-0.25);
      if (event.key === "r" || event.key === "R") setRotation((r) => r + 90);
      if (event.key === "0") reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adjust, reset]);

  const fit = zoom === 1;

  return (
    <div className="relative size-full overflow-auto">
      {!loaded && <Spinner />}

      {/* Phóng to bằng cách đổi chiều rộng để vùng cuộn mở rộng theo, không bị cắt mép */}
      <div className="flex min-h-full min-w-full p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.name}
          onLoad={() => setLoaded(true)}
          draggable={false}
          style={{
            width: fit ? undefined : `${zoom * 100}%`,
            maxWidth: fit ? "100%" : "none",
            maxHeight: fit ? "calc(100vh - 14rem)" : "none",
            transform: `rotate(${rotation}deg)`,
          }}
          className={cn(
            "m-auto h-auto shrink-0 rounded shadow-2xl transition-[transform,width] duration-150",
            !loaded && "opacity-0",
          )}
        />
      </div>

      <div className="pointer-events-none sticky bottom-4 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 p-1 text-white backdrop-blur">
          <ToolButton label="Thu nhỏ (-)" onClick={() => adjust(-0.25)}>
            <Minus className="size-4" />
          </ToolButton>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title="Vừa khung"
            className="min-w-14 rounded-full px-2 text-xs tabular-nums hover:bg-white/15"
          >
            {Math.round(zoom * 100)}%
          </button>
          <ToolButton label="Phóng to (+)" onClick={() => adjust(0.25)}>
            <Plus className="size-4" />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-white/25" />
          <ToolButton label="Xoay 90 độ (R)" onClick={() => setRotation((r) => r + 90)}>
            <RotateCw className="size-4" />
          </ToolButton>
          <ToolButton label="Về mặc định (0)" onClick={reset}>
            <Maximize2 className="size-4" />
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {children}
    </button>
  );
}

/* ------------------------------ Word ------------------------------- */

/**
 * .docx dựng lại thành HTML ngay trên trình duyệt bằng mammoth.
 * Cài thêm: npm i mammoth
 */
function WordPreview({ file }: { file: FileItem }) {
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const [{ default: mammoth }, response] = await Promise.all([
          import("mammoth/mammoth.browser"),
          fetch(file.url!),
        ]);
        if (!response.ok) throw new Error(String(response.status));

        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (cancelled) return;

        setHtml(result.value);
        setStatus("done");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (status === "loading") return <Spinner />;
  if (status === "error") {
    return <Unavailable file={file} reason="Không dựng được nội dung. File .doc cũ cần tải về để mở." />;
  }

  return (
    <div className="size-full overflow-auto bg-neutral-800 p-3 sm:p-6">
      <article
        // HTML do mammoth sinh ra từ chính file trong kho.
        // Nếu kho nhận file từ người ngoài, lọc qua DOMPurify trước khi render.
        dangerouslySetInnerHTML={{ __html: html }}
        className="prose prose-neutral mx-auto max-w-[70ch] rounded-lg bg-white p-6 shadow-2xl sm:p-10"
      />
    </div>
  );
}

/* --------------------------- Text / code --------------------------- */

function TextPreview({ file }: { file: FileItem }) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    fetch(file.url!)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        setContent(text.slice(0, 500_000));
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (status === "loading") return <Spinner />;
  if (status === "error") return <Unavailable file={file} reason="Không đọc được nội dung file." />;

  return (
    <div className="size-full overflow-auto bg-neutral-900 p-3 sm:p-6">
      <pre className="mx-auto max-w-5xl whitespace-pre-wrap break-words rounded-lg bg-neutral-950 p-4 font-mono text-[13px] leading-relaxed text-neutral-200 ring-1 ring-white/10 sm:p-6">
        {content}
      </pre>
    </div>
  );
}

/* --------------------------- Trạng thái ---------------------------- */

function Spinner() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <LoaderCircle className="size-6 animate-spin text-neutral-400" />
    </div>
  );
}

function Unavailable({ file, reason }: { file: FileItem; reason: string }) {
  return (
    <div className="grid size-full place-items-center p-8 text-center">
      <div className="max-w-sm">
        <FileIcon kind={getFileKind(file)} className="mx-auto mb-4 size-14" />
        <p className="mb-1 text-sm font-medium text-neutral-100">{file.name}</p>
        <p className="mb-5 text-sm text-neutral-400">{reason}</p>
        {file.url && (
          <a
            href={file.downloadUrl ?? file.url}
            download={file.name}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
          >
            <Download className="size-4" />
            Tải về để mở
          </a>
        )}
      </div>
    </div>
  );
}
