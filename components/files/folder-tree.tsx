"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, EyeOff, Folder as FolderIcon, FolderOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { childFolders } from "@/lib/file-utils";
import type { Folder } from "@/types/file";

interface FolderTreeProps {
  folders: Folder[];
  currentId: string;
  onSelect: (folderId: string) => void;
}

export function FolderTree({ folders, currentId, onSelect }: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const current = folders.find((f) => f.id === currentId);

  // Mở sẵn đường dẫn dẫn tới thư mục đang xem
  useEffect(() => {
    if (!current) return;
    const segments = current.path.split("/").filter(Boolean);
    const ancestors = segments.slice(0, -1).map((_, i) => segments.slice(0, i + 1).join("/"));
    setExpanded((prev) => new Set([...prev, ...ancestors]));
  }, [current?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const roots = useMemo(() => childFolders(folders, ""), [folders]);

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function renderBranch(list: Folder[], depth: number) {
    if (!list.length) return null;

    return (
      <ul role="group" className="space-y-px">
        {list.map((folder) => {
          const children = childFolders(folders, folder.path);
          const isOpen = expanded.has(folder.path);
          const isActive = folder.id === currentId;

          return (
            <li key={folder.id}>
              <div
                role="treeitem"
                aria-expanded={children.length ? isOpen : undefined}
                aria-selected={isActive}
                aria-disabled={!folder.canList}
                tabIndex={0}
                onClick={() => onSelect(folder.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(folder.id);
                  }
                  if (event.key === "ArrowRight" && children.length && !isOpen) toggle(folder.path);
                  if (event.key === "ArrowLeft" && isOpen) toggle(folder.path);
                }}
                style={{ paddingLeft: depth * 12 + 8 }}
                className={cn(
                  "group flex h-8 cursor-pointer items-center gap-1 rounded-md pr-2 text-sm outline-none transition-colors",
                  "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-accent font-medium text-accent-foreground",
                  !folder.canList && "text-muted-foreground",
                )}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (children.length) toggle(folder.path);
                  }}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm",
                    !children.length && "invisible",
                  )}
                >
                  <ChevronRight
                    className={cn("size-3.5 transition-transform duration-150", isOpen && "rotate-90")}
                  />
                </button>

                {isOpen && children.length ? (
                  <FolderOpen className="size-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                ) : (
                  <FolderIcon className="size-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                )}

                <span className="truncate">{folder.name}</span>

                {!folder.canList && (
                  <EyeOff
                    className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Không có quyền xem danh sách"
                  />
                )}
              </div>

              {isOpen && renderBranch(children, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <nav role="tree" aria-label="Cây thư mục" className="p-2 text-sm">
      {roots.length ? (
        renderBranch(roots, 0)
      ) : (
        <p className="px-2 py-4 text-xs text-muted-foreground">Chưa có thư mục nào.</p>
      )}
    </nav>
  );
}
