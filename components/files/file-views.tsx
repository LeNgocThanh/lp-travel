"use client";

import { ArrowDown, ArrowUp, Download, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/files/file-icon";
import { KIND_LABEL, formatBytes, formatRelative, getFileKind } from "@/lib/file-utils";
import type { FileItem, SortDir, SortKey } from "@/types/file";

export interface ViewProps {
  items: FileItem[];
  selectedKey: string | null;
  canRead: boolean;
  canDelete: boolean;
  onSelect: (item: FileItem) => void;
  onOpen: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
}

/* ============================== Lưới =============================== */

export function FileGrid({
  items,
  selectedKey,
  canRead,
  canDelete,
  onSelect,
  onOpen,
  onDelete,
}: ViewProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-4">
      {items.map((item) => {
        const kind = getFileKind(item);
        const isSelected = item.key === selectedKey;

        return (
          <div
            key={item.key}
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
            onClick={() => onSelect(item)}
            onDoubleClick={() => onOpen(item)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onOpen(item);
              if (event.key === " ") {
                event.preventDefault();
                onSelect(item);
              }
            }}
            className={cn(
              "group relative flex cursor-pointer flex-col rounded-xl border bg-card p-2 text-left outline-none",
              "transition-colors hover:border-foreground/20 hover:bg-accent/40",
              "focus-visible:ring-2 focus-visible:ring-ring",
              isSelected && "border-primary/60 bg-primary/5 hover:border-primary/60",
            )}
          >
            <div className="relative mb-2 grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-muted/60">
              {kind === "image" && item.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
              ) : (
                <FileIcon kind={kind} className="size-10" filled />
              )}

              <ItemActions
                item={item}
                canRead={canRead}
                canDelete={canDelete}
                onDelete={onDelete}
                className="absolute right-1 top-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
              />
            </div>

            <p className="line-clamp-2 break-all text-[13px] font-medium leading-snug">{item.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.isFolder ? KIND_LABEL.folder : formatBytes(item.size)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ============================ Danh sách ============================= */

interface FileListProps extends ViewProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

export function FileList({
  items,
  selectedKey,
  canRead,
  canDelete,
  onSelect,
  onOpen,
  onDelete,
  sortKey,
  sortDir,
  onSort,
}: FileListProps) {
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <thead className="sticky top-0 z-10">
        <tr className="bg-background/95 backdrop-blur">
          <HeaderCell label="Tên" sortAs="name" {...{ sortKey, sortDir, onSort }} className="pl-4" />
          <HeaderCell label="Loại" sortAs="kind" {...{ sortKey, sortDir, onSort }} className="hidden w-40 md:table-cell" />
          <HeaderCell label="Dung lượng" sortAs="size" {...{ sortKey, sortDir, onSort }} className="hidden w-32 sm:table-cell" />
          <HeaderCell label="Ngày tạo" sortAs="createdAt" {...{ sortKey, sortDir, onSort }} className="hidden w-44 lg:table-cell" />
          <th className="w-20 border-b" />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const kind = getFileKind(item);
          const isSelected = item.key === selectedKey;

          return (
            <tr
              key={item.key}
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => onSelect(item)}
              onDoubleClick={() => onOpen(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onOpen(item);
              }}
              className={cn(
                "group cursor-pointer outline-none transition-colors",
                "hover:bg-accent/50 focus-visible:bg-accent",
                isSelected && "bg-primary/5",
              )}
            >
              <td className="border-b py-2 pl-4 pr-3">
                <div className="flex items-center gap-2.5">
                  {kind === "image" && item.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.url} alt="" loading="lazy" className="size-7 shrink-0 rounded object-cover" />
                  ) : (
                    <FileIcon kind={kind} className="size-5 shrink-0" filled />
                  )}
                  <span className="truncate font-medium">{item.name}</span>
                </div>
              </td>
              <td className="hidden border-b px-3 text-muted-foreground md:table-cell">
                {KIND_LABEL[kind]}
              </td>
              <td className="hidden border-b px-3 tabular-nums text-muted-foreground sm:table-cell">
                {item.isFolder ? "—" : formatBytes(item.size)}
              </td>
              <td className="hidden border-b px-3 text-muted-foreground lg:table-cell">
                {formatRelative(item.createdAt)}
              </td>
              <td className="border-b pr-3">
                <ItemActions
                  item={item}
                  canRead={canRead}
                  canDelete={canDelete}
                  onDelete={onDelete}
                  className="justify-end opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function HeaderCell({
  label,
  sortAs,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  sortAs: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === sortAs;

  return (
    <th className={cn("border-b px-3 py-2 text-left font-medium text-muted-foreground", className)}>
      <button
        type="button"
        onClick={() => onSort(sortAs)}
        className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        {active && (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
}

/* =========================== Thư viện ảnh =========================== */

export function FileGallery({ items, selectedKey, onSelect, onOpen }: ViewProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => {
        const kind = getFileKind(item);
        const isSelected = item.key === selectedKey;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item)}
            onDoubleClick={() => onOpen(item)}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg bg-muted outline-none",
              "ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "ring-2 ring-primary ring-offset-2",
            )}
          >
            {kind === "image" && item.url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.url}
                alt={item.name}
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="grid size-full place-items-center">
                <FileIcon kind={kind} className="size-9" filled />
              </div>
            )}

            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-xs text-white">
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================ Tác vụ ============================== */

function ItemActions({
  item,
  canRead,
  canDelete,
  onDelete,
  className,
}: {
  item: FileItem;
  canRead: boolean;
  canDelete: boolean;
  onDelete: (item: FileItem) => void;
  className?: string;
}) {
  if (item.isFolder) return null;

  const buttonClass =
    "grid size-7 place-items-center rounded-md bg-background/85 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {canRead && item.url && (
        <a
          href={item.url}
          download={item.name}
          aria-label={`Tải về ${item.name}`}
          title="Tải về"
          onClick={(event) => event.stopPropagation()}
          className={buttonClass}
        >
          <Download className="size-4" />
        </a>
      )}

      {canDelete && (
        <button
          type="button"
          aria-label={`Xóa ${item.name}`}
          title="Xóa"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
          className={cn(buttonClass, "hover:bg-destructive/10 hover:text-destructive")}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
