"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronRight,
  Download,
  FolderPlus,
  Grid2X2,
  Images,
  Info,
  List,
  PanelLeft,
  Search,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { FileIcon } from "@/components/files/file-icon";
import { FilePreview } from "@/components/files/file-preview";
import { FileTree } from "@/components/files/file-tree";
import { FileGallery, FileGrid, FileList } from "@/components/files/file-views";
import {
  KIND_LABEL,
  formatBytes,
  formatDate,
  getBreadcrumb,
  getFileKind,
  getFolderSize,
  isPreviewable,
  sortNodes,
} from "@/lib/file-utils";
import type { FileNode, FilesManagerProps, SortKey, ViewMode } from "@/types/file";

const VIEW_STORAGE_KEY = "files-manager:view";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Tên",
  size: "Dung lượng",
  updatedAt: "Ngày chỉnh sửa",
  kind: "Loại tệp",
};

export function FilesManager({
  nodes,
  initialFolderId = null,
  onUpload,
  onCreateFolder,
  onRename,
  onDelete,
}: FilesManagerProps) {
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Nhớ kiểu xem người dùng đã chọn lần trước
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
      if (saved === "grid" || saved === "list" || saved === "gallery") setView(saved);
    } catch {
      /* bỏ qua nếu trình duyệt chặn storage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      /* bỏ qua */
    }
  }, [view]);

  // Ctrl/Cmd + K để nhảy vào ô tìm kiếm
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const breadcrumb = useMemo(() => getBreadcrumb(nodes, folderId), [nodes, folderId]);

  const sizeOf = useCallback(
    (node: FileNode) => (node.isFolder ? getFolderSize(nodes, node.id) : node.size),
    [nodes],
  );

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    // Có từ khoá thì tìm trên toàn bộ kho, không giới hạn thư mục hiện tại
    const scope = keyword
      ? nodes.filter((n) => n.name.toLowerCase().includes(keyword))
      : nodes.filter((n) => n.parentId === folderId);

    const filtered = view === "gallery" && !keyword
      ? scope.filter((n) => n.isFolder || getFileKind(n) === "image")
      : scope;

    return sortNodes(filtered, sortKey, sortDir);
  }, [nodes, folderId, query, sortKey, sortDir, view]);

  /** Các tệp xem trước được, để bấm mũi tên qua lại trong dialog */
  const previewables = useMemo(
    () => visible.filter((n) => !n.isFolder && n.url && isPreviewable(getFileKind(n))),
    [visible],
  );

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const preview = previewId ? byId.get(previewId) ?? null : null;

  function open(node: FileNode) {
    if (node.isFolder) {
      setFolderId(node.id);
      setQuery("");
      setSelectedId(null);
      return;
    }
    if (node.url && isPreviewable(getFileKind(node))) setPreviewId(node.id);
    else if (node.url) window.open(node.url, "_blank", "noreferrer");
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length || !onUpload) return;
    await onUpload(Array.from(list), folderId);
  }

  const folderCount = visible.filter((n) => n.isFolder).length;
  const fileCount = visible.length - folderCount;

  const viewProps = {
    nodes: visible,
    sizeOf,
    selectedId,
    onSelect: (n: FileNode) => setSelectedId(n.id),
    onOpen: open,
    onRename: onRename ? (n: FileNode) => promptRename(n, onRename) : undefined,
    onDelete,
  };

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden rounded-xl border bg-background">
      {/* ------------------------------ Đầu trang ------------------------------ */}
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="mr-auto">
          <h1 className="text-base font-semibold leading-tight">Tệp</h1>
          <p className="text-xs text-muted-foreground">
            {folderCount > 0 && `${folderCount} thư mục · `}
            {fileCount} tệp
            {query && " khớp với từ khoá"}
          </p>
        </div>

        {onCreateFolder && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const name = window.prompt("Tên thư mục mới");
              if (name?.trim()) onCreateFolder(name.trim(), folderId);
            }}
          >
            <FolderPlus className="size-4" />
            Thư mục mới
          </Button>
        )}

        {onUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              Tải tệp lên
            </Button>
          </>
        )}
      </header>

      {/* ----------------------------- Thanh công cụ ---------------------------- */}
      <div className="flex items-center gap-2 border-b px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={showTree ? "Ẩn cây thư mục" : "Hiện cây thư mục"}
          aria-pressed={showTree}
          onClick={() => setShowTree((v) => !v)}
        >
          <PanelLeft className="size-4" />
        </Button>

        <Breadcrumb trail={breadcrumb} onNavigate={setFolderId} />

        <div className="relative ml-auto w-40 shrink-0 sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tệp…"
            className="h-8 pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xoá từ khoá"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Sắp xếp">
              <ArrowUpDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sắp xếp theo</DropdownMenuLabel>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={sortKey === key}
                onSelect={(e) => {
                  e.preventDefault();
                  toggleSort(key);
                }}
              >
                {SORT_LABELS[key]}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortDir === "asc"}
              onSelect={() => setSortDir("asc")}
            >
              Tăng dần
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortDir === "desc"}
              onSelect={() => setSortDir("desc")}
            >
              Giảm dần
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex shrink-0 items-center rounded-md border p-0.5">
          <ViewButton active={view === "grid"} label="Lưới" onClick={() => setView("grid")}>
            <Grid2X2 className="size-4" />
          </ViewButton>
          <ViewButton active={view === "list"} label="Danh sách" onClick={() => setView("list")}>
            <List className="size-4" />
          </ViewButton>
          <ViewButton active={view === "gallery"} label="Thư viện ảnh" onClick={() => setView("gallery")}>
            <Images className="size-4" />
          </ViewButton>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Chi tiết tệp"
          aria-pressed={showDetails}
          onClick={() => setShowDetails((v) => !v)}
        >
          <Info className="size-4" />
        </Button>
      </div>

      {/* -------------------------------- Thân ---------------------------------- */}
      <div className="flex min-h-0 flex-1">
        {showTree && (
          <aside className="hidden w-56 shrink-0 border-r md:block">
            <ScrollArea className="h-full">
              <FileTree
                nodes={nodes}
                currentFolderId={folderId}
                onSelect={(id) => {
                  setFolderId(id);
                  setQuery("");
                  setSelectedId(null);
                }}
              />
            </ScrollArea>
          </aside>
        )}

        <main
          className="relative min-w-0 flex-1"
          onDragEnter={(e) => {
            if (!onUpload) return;
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => onUpload && e.preventDefault()}
          onDragLeave={() => {
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) setDragging(false);
          }}
          onDrop={(e) => {
            if (!onUpload) return;
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <ScrollArea className="h-full">
            {visible.length === 0 ? (
              <EmptyState query={query} canUpload={Boolean(onUpload)} onUpload={() => inputRef.current?.click()} />
            ) : view === "list" ? (
              <FileList {...viewProps} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            ) : view === "gallery" ? (
              <FileGallery {...viewProps} />
            ) : (
              <FileGrid {...viewProps} />
            )}
          </ScrollArea>

          {dragging && (
            <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]">
              <div className="text-center">
                <Upload className="mx-auto mb-2 size-7 text-primary" />
                <p className="text-sm font-medium">Thả tệp vào đây để tải lên</p>
              </div>
            </div>
          )}
        </main>

        {showDetails && (
          <aside className="hidden w-72 shrink-0 border-l lg:block">
            <DetailsPanel node={selected} sizeOf={sizeOf} onOpen={open} />
          </aside>
        )}
      </div>

      <FilePreview
        file={preview}
        siblings={previewables}
        onOpenChange={(open) => !open && setPreviewId(null)}
        onNavigate={(f) => setPreviewId(f.id)}
      />
    </div>
  );
}

/* --------------------------- Thành phần phụ ---------------------------- */

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-7 place-items-center rounded transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Breadcrumb({
  trail,
  onNavigate,
}: {
  trail: FileNode[];
  onNavigate: (id: string | null) => void;
}) {
  // Đường dẫn dài thì gập phần giữa lại
  const collapsed = trail.length > 3 ? [trail[0], null, ...trail.slice(-2)] : trail;

  return (
    <nav aria-label="Đường dẫn" className="flex min-w-0 items-center gap-0.5 text-sm">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Tất cả tệp
      </button>

      {collapsed.map((node, i) =>
        node === null ? (
          <span key="ellipsis" className="px-1 text-muted-foreground">
            <ChevronRight className="inline size-3.5" />…
          </span>
        ) : (
          <span key={node.id} className="flex min-w-0 items-center">
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            <button
              type="button"
              onClick={() => onNavigate(node.id)}
              className={cn(
                "truncate rounded px-1.5 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === collapsed.length - 1 ? "font-medium" : "text-muted-foreground",
              )}
            >
              {node.name}
            </button>
          </span>
        ),
      )}
    </nav>
  );
}

function DetailsPanel({
  node,
  sizeOf,
  onOpen,
}: {
  node: FileNode | null;
  sizeOf: (n: FileNode) => number | undefined;
  onOpen: (n: FileNode) => void;
}) {
  if (!node) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Chọn một tệp để xem thông tin chi tiết.
        </p>
      </div>
    );
  }

  const kind = getFileKind(node);
  const src = node.thumbnailUrl ?? node.url;

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="mb-4 grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-muted">
          {kind === "image" && src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            <FileIcon kind={kind} className="size-12" filled />
          )}
        </div>

        <p className="break-all text-sm font-medium">{node.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{KIND_LABEL[kind]}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Dung lượng" value={formatBytes(sizeOf(node))} />
          <Row label="Chỉnh sửa" value={formatDate(node.updatedAt)} />
          {node.owner && <Row label="Người tải lên" value={node.owner} />}
          {node.mimeType && <Row label="Định dạng" value={node.mimeType} />}
        </dl>

        <div className="mt-5 flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onOpen(node)}>
            {node.isFolder ? "Mở thư mục" : "Xem trước"}
          </Button>
          {node.url && !node.isFolder && (
            <Button size="sm" variant="outline" asChild>
              <a href={node.url} download={node.name} aria-label="Tải về">
                <Download className="size-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}

function EmptyState({
  query,
  canUpload,
  onUpload,
}: {
  query: string;
  canUpload: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="grid h-full min-h-80 place-items-center p-8 text-center">
      <div className="max-w-xs">
        <FileIcon kind="folder" className="mx-auto mb-3 size-12" filled />
        {query ? (
          <>
            <p className="text-sm font-medium">Không có tệp nào tên “{query}”</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thử từ khoá ngắn hơn, hoặc bỏ dấu.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Thư mục này đang trống</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Kéo tệp vào đây hoặc bấm nút bên dưới để bắt đầu.
            </p>
            {canUpload && (
              <Button size="sm" className="mt-4" onClick={onUpload}>
                <Upload className="size-4" />
                Tải tệp lên
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function promptRename(node: FileNode, onRename: (n: FileNode, name: string) => void) {
  const name = window.prompt("Tên mới", node.name);
  if (name?.trim() && name.trim() !== node.name) onRename(node, name.trim());
}
