"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, HardDrive } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FileNode } from "@/types/file";

interface FileTreeProps {
  nodes: FileNode[];
  currentFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

export function FileTree({ nodes, currentFolderId, onSelect }: FileTreeProps) {
  const folders = useMemo(() => nodes.filter((n) => n.isFolder), [nodes]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, FileNode[]>();
    for (const f of folders) {
      const list = map.get(f.parentId) ?? [];
      list.push(f);
      map.set(f.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }));
    }
    return map;
  }, [folders]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function renderBranch(parentId: string | null, depth: number) {
    const list = childrenOf.get(parentId);
    if (!list?.length) return null;

    return (
      <ul role="group" className="space-y-px">
        {list.map((folder) => {
          const hasChildren = Boolean(childrenOf.get(folder.id)?.length);
          const isOpen = expanded.has(folder.id);
          const isActive = currentFolderId === folder.id;

          return (
            <li key={folder.id}>
              <div
                role="treeitem"
                aria-expanded={hasChildren ? isOpen : undefined}
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => onSelect(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(folder.id);
                  }
                  if (e.key === "ArrowRight" && hasChildren && !isOpen) toggle(folder.id);
                  if (e.key === "ArrowLeft" && isOpen) toggle(folder.id);
                }}
                style={{ paddingLeft: depth * 12 + 8 }}
                className={cn(
                  "group flex h-8 cursor-pointer items-center gap-1 rounded-md pr-2 text-sm outline-none transition-colors",
                  "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) toggle(folder.id);
                  }}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm",
                    !hasChildren && "invisible",
                  )}
                >
                  <ChevronRight
                    className={cn("size-3.5 transition-transform duration-150", isOpen && "rotate-90")}
                  />
                </button>

                {isOpen && hasChildren ? (
                  <FolderOpen className="size-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                ) : (
                  <Folder className="size-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                )}

                <span className="truncate">{folder.name}</span>
              </div>

              {isOpen && renderBranch(folder.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <nav role="tree" aria-label="Cây thư mục" className="space-y-px p-2 text-sm">
      <div
        role="treeitem"
        aria-selected={currentFolderId === null}
        tabIndex={0}
        onClick={() => onSelect(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(null);
          }
        }}
        className={cn(
          "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 outline-none transition-colors",
          "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          currentFolderId === null && "bg-accent font-medium",
        )}
      >
        <HardDrive className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span>Tất cả tệp</span>
      </div>

      {renderBranch(null, 1)}
    </nav>
  );
}
