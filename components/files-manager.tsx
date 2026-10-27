"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronRight,
  Download,
  FileUp,
  FolderPlus,
  Grid2X2,
  Images,
  Info,
  List,
  LoaderCircle,
  Lock,
  PanelLeft,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { FileIcon } from "@/components/files/file-icon";
import { FilePreview } from "@/components/files/file-preview";
import { FileEditor } from "@/components/files/file-editor";
import { FolderTree } from "@/components/files/folder-tree";
import { FileGallery, FileGrid, FileList } from "@/components/files/file-views";
import { fileUrl, useFilesApi } from "@/lib/use-files-api";
import {
  KIND_LABEL,
  buildBreadcrumb,
  childFolders,
  formatBytes,
  formatDate,
  getFileKind,
  isPreviewable,
  sortItems,
} from "@/lib/file-utils";
import type { FileItem, SortDir, SortKey, ViewMode } from "@/types/file";

const VIEW_STORAGE_KEY = "files-manager:view";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Tên",
  size: "Dung lượng",
  createdAt: "Ngày tạo",
  kind: "Loại file",
};

const PERMISSION_LABELS: Record<string, string> = {
  canUpload: "tải lên",
  canList: "xem danh sách",
  canRead: "đọc",
  canDelete: "xóa",
  canCreateFolder: "tạo thư mục",
};

export function FilesManager() {
  const api = useFilesApi();
  const {
    folders,
    folderId,
    setFolderId,
    selected,
    files,
    loadingFolders,
    loadingFiles,
    error,
    notice,
    dismiss,
    reloadFiles,
    upload,
    createFolder,
    remove,
    uploadVersion,
    restoreVersion,
  } = api;

  const [view, setView] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
      return saved === "grid" || saved === "list" || saved === "gallery" ? saved : "grid";
    } catch {
      /* trình duyệt chặn storage thì bỏ qua */
      return "grid";
    }
  });
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [dragging, setDragging] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      /* bỏ qua */
    }
  }, [view]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ----------------- Gộp thư mục con và file thành một danh sách ----------------- */

  const items = useMemo<FileItem[]>(() => {
    if (!selected) return [];

    const subFolders: FileItem[] = childFolders(folders, selected.path).map((folder) => ({
      key: `folder:${folder.id}`,
      name: folder.name,
      isFolder: true,
      folderId: folder.id,
    }));

    const fileItems: FileItem[] = files.map((file) => ({
      key: `file:${file.id}`,
      name: file.originalName,
      isFolder: false,
      storedName: file.storedName,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
      currentVersion: file.currentVersion,
      currentVersionId: file.currentVersionId,
      versions: file.versions,
      url: selected.canRead ? fileUrl(file.storedName, folderId) : undefined,
    }));

    return [...subFolders, ...fileItems];
  }, [folders, files, selected, folderId]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    let result = keyword
      ? items.filter((item) => item.name.toLowerCase().includes(keyword))
      : items;

    if (view === "gallery") {
      result = result.filter((item) => item.isFolder || getFileKind(item) === "image");
    }

    return sortItems(result, sortKey, sortDir);
  }, [items, query, view, sortKey, sortDir]);

  const previewables = useMemo(
    () => visible.filter((item) => !item.isFolder && item.url && isPreviewable(getFileKind(item))),
    [visible],
  );

  const current = selectedKey ? items.find((item) => item.key === selectedKey) ?? null : null;
  const preview = previewKey ? items.find((item) => item.key === previewKey) ?? null : null;
  const editing = editingKey ? items.find((item) => item.key === editingKey) ?? null : null;

  const breadcrumb = selected ? buildBreadcrumb(folders, selected) : [];
  const folderCount = visible.filter((item) => item.isFolder).length;
  const fileCount = visible.length - folderCount;

  /* --------------------------------- Hành vi --------------------------------- */

  function changeFolder(nextFolderId: string) {
    setSelectedKey(null);
    setQuery("");
    setShowNewFolder(false);
    setFolderId(nextFolderId);
  }

  function open(item: FileItem) {
    if (item.isFolder && item.folderId) {
      changeFolder(item.folderId);
      return;
    }
    if (!item.url) return;

    if (isPreviewable(getFileKind(item))) setPreviewKey(item.key);
    else window.open(item.url, "_blank", "noreferrer");
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleDelete(item: FileItem) {
    if (!item.storedName) return;
    if (!window.confirm(`Chuyển "${item.name}" vào thùng rác?`)) return;
    if (previewKey === item.key) setPreviewKey(null);
    void remove(item.storedName);
  }

  function handleNewFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    void createFolder(name);
    form.reset();
    setShowNewFolder(false);
  }

  const viewProps = {
    items: visible,
    selectedKey,
    canRead: Boolean(selected?.canRead),
    canDelete: Boolean(selected?.canDelete),
    onSelect: (item: FileItem) => setSelectedKey(item.key),
    onOpen: open,
    onDelete: handleDelete,
  };

  /* ---------------------------------- Giao diện ---------------------------------- */

  return (
    <div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden rounded-xl border bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="mr-auto min-w-0">
          <h1 className="text-base font-semibold leading-tight">Kho tài liệu</h1>
          <p className="truncate text-xs text-muted-foreground">
            {selected
              ? `${folderCount > 0 ? `${folderCount} thư mục · ` : ""}${fileCount} file trong /${selected.path}`
              : "Chưa chọn thư mục"}
          </p>
        </div>

        <input
          ref={uploadRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            const list = event.target.files;
            if (list?.length) void upload(Array.from(list));
            event.target.value = "";
          }}
        />

        {selected?.canCreateFolder && (
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder((value) => !value)}>
            <FolderPlus />
            Thư mục mới
          </Button>
        )}

        {selected?.canUpload && (
          <Button size="sm" onClick={() => uploadRef.current?.click()}>
            <FileUp />
            Tải file lên
          </Button>
        )}
      </header>

      {showNewFolder && selected?.canCreateFolder && (
        <form onSubmit={handleNewFolder} className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
          <span className="shrink-0 text-sm text-muted-foreground">/{selected.path}/</span>
          <Input
            name="name"
            autoFocus
            required
            pattern="[a-zA-Z0-9_-]+"
            placeholder="ten-thu-muc"
            title="Chỉ dùng chữ không dấu, số, gạch ngang và gạch dưới"
            className="h-8 max-w-64"
          />
          <Button type="submit" size="sm">
            Tạo
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>
            Hủy
          </Button>
        </form>
      )}

      {(error || notice) && (
        <div className="border-b px-4 py-2">
          <Alert>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span className={cn(error && "text-destructive")}>{error || notice}</span>
              <button type="button" onClick={dismiss} aria-label="Đóng thông báo">
                <X className="size-4" />
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* ------------------------------ Thanh công cụ ------------------------------ */}
      <div className="flex items-center gap-2 border-b px-2 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={showTree ? "Ẩn cây thư mục" : "Hiện cây thư mục"}
          aria-pressed={showTree}
          onClick={() => setShowTree((value) => !value)}
        >
          <PanelLeft />
        </Button>

        <nav aria-label="Đường dẫn" className="flex min-w-0 items-center gap-0.5 text-sm">
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />}
              {crumb.folder ? (
                <button
                  type="button"
                  onClick={() => changeFolder(crumb.folder!.id)}
                  className={cn(
                    "truncate rounded px-1.5 py-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    index === breadcrumb.length - 1 ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="truncate px-1.5 py-1 text-muted-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="relative ml-auto w-36 shrink-0 sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm trong thư mục…"
            className="h-8 pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa từ khóa"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <SortMenu
          sortKey={sortKey}
          sortDir={sortDir}
          onToggle={toggleSort}
          onDirection={setSortDir}
        />

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
          size="icon-sm"
          aria-label="Làm mới"
          onClick={() => void reloadFiles()}
        >
          <RefreshCw />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Thông tin file"
          aria-pressed={showDetails}
          onClick={() => setShowDetails((value) => !value)}
        >
          <Info />
        </Button>
      </div>

      {/* ---------------------------------- Thân ---------------------------------- */}
      <div className="flex min-h-0 flex-1">
        {showTree && (
          <aside className="hidden w-56 shrink-0 overflow-auto border-r md:block">
            {loadingFolders ? (
              <div className="flex justify-center py-8">
                <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <FolderTree folders={folders} currentId={folderId} onSelect={changeFolder} />
            )}
          </aside>
        )}

        <main
          className="relative min-w-0 flex-1 overflow-auto"
          onDragEnter={(event) => {
            if (!selected?.canUpload) return;
            event.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(event) => {
            if (selected?.canUpload) event.preventDefault();
          }}
          onDragLeave={() => {
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) setDragging(false);
          }}
          onDrop={(event) => {
            if (!selected?.canUpload) return;
            event.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            const list = event.dataTransfer.files;
            if (list?.length) void upload(Array.from(list));
          }}
        >
          {loadingFiles ? (
            <div className="flex justify-center py-20">
              <LoaderCircle className="animate-spin text-muted-foreground" />
            </div>
          ) : !selected ? (
            <Placeholder title="Chưa có thư mục nào" body="Bạn chưa được cấp quyền vào thư mục nào." />
          ) : !selected.canList ? (
            <Placeholder
              icon={<Lock className="mx-auto mb-3 size-10 text-muted-foreground" />}
              title="Không xem được thư mục này"
              body="Bạn không có quyền xem danh sách file ở đây. Chọn thư mục khác trong cây bên trái."
            />
          ) : visible.length === 0 ? (
            <Placeholder
              title={query ? `Không có file nào tên “${query}”` : "Thư mục này đang trống"}
              body={
                query
                  ? "Thử từ khóa ngắn hơn, hoặc bỏ dấu."
                  : selected.canUpload
                    ? "Kéo file vào đây hoặc bấm “Tải file lên” ở trên."
                    : "Chưa có file nào trong thư mục."
              }
            />
          ) : view === "list" ? (
            <FileList {...viewProps} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          ) : view === "gallery" ? (
            <FileGallery {...viewProps} />
          ) : (
            <FileGrid {...viewProps} />
          )}

          {dragging && (
            <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]">
              <div className="text-center">
                <FileUp className="mx-auto mb-2 size-7 text-primary" />
                <p className="text-sm font-medium">Thả file vào đây để tải lên</p>
              </div>
            </div>
          )}
        </main>

        {showDetails && (
          <aside className="hidden w-72 shrink-0 overflow-auto border-l lg:block">
            <DetailsPanel
              item={current}
              folderPath={selected?.path}
              folderId={folderId}
              canRead={Boolean(selected?.canRead)}
              canUpload={Boolean(selected?.canUpload)}
              onOpen={open}
              onEdit={(item) => setEditingKey(item.key)}
              onUploadVersion={uploadVersion}
              onRestoreVersion={restoreVersion}
            />
          </aside>
        )}
      </div>

      {/* Quyền của thư mục đang mở, để biết vì sao một nút không hiện */}
      {selected && (
        <footer className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2">
          <span className="mr-1 text-xs text-muted-foreground">Quyền của bạn:</span>
          {(["canList", "canRead", "canUpload", "canDelete", "canCreateFolder"] as const)
            .filter((key) => selected[key])
            .map((key) => (
              <Badge key={key} variant="secondary">
                {PERMISSION_LABELS[key]}
              </Badge>
            ))}
        </footer>
      )}

      <FilePreview
        file={preview}
        siblings={previewables}
        onClose={() => setPreviewKey(null)}
        onNavigate={(item) => setPreviewKey(item.key)}
      />
      {editing && !editing.isFolder && editing.storedName && (
        <FileEditor file={editing} folderId={folderId} onClose={() => setEditingKey(null)} onSaved={reloadFiles} />
      )}
    </div>
  );
}

/* ------------------------------ Thành phần phụ ------------------------------ */

function SortMenu({
  sortKey,
  sortDir,
  onToggle,
  onDirection,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
  onDirection: (dir: SortDir) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onClick() {
      setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sắp xếp"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ArrowUpDown />
      </Button>

      {open && (
        <div className="absolute right-0 top-9 z-40 w-44 rounded-md border bg-popover p-1 text-sm shadow-md">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-accent",
                sortKey === key && "font-medium",
              )}
            >
              {SORT_LABELS[key]}
              {sortKey === key && (
                <span className="text-xs text-muted-foreground">
                  {sortDir === "asc" ? "A→Z" : "Z→A"}
                </span>
              )}
            </button>
          ))}

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={() => onDirection("asc")}
            className={cn("w-full rounded px-2 py-1.5 text-left hover:bg-accent", sortDir === "asc" && "font-medium")}
          >
            Tăng dần
          </button>
          <button
            type="button"
            onClick={() => onDirection("desc")}
            className={cn("w-full rounded px-2 py-1.5 text-left hover:bg-accent", sortDir === "desc" && "font-medium")}
          >
            Giảm dần
          </button>
        </div>
      )}
    </div>
  );
}

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
        "grid size-7 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function DetailsPanel({
  item,
  folderPath,
  folderId,
  canRead,
  canUpload,
  onOpen,
  onEdit,
  onUploadVersion,
  onRestoreVersion,
}: {
  item: FileItem | null;
  folderPath?: string;
  folderId: string;
  canRead: boolean;
  canUpload: boolean;
  onOpen: (item: FileItem) => void;
  onEdit: (item: FileItem) => void;
  onUploadVersion: (storedName: string, currentVersionId: string, file: File) => Promise<void>;
  onRestoreVersion: (storedName: string, versionId: string, currentVersionId: string) => Promise<void>;
}) {
  const versionUploadRef = useRef<HTMLInputElement>(null);
  if (!item) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Chọn một file để xem thông tin.</p>
      </div>
    );
  }

  const kind = getFileKind(item);

  return (
    <div className="p-4">
      <div className="mb-4 grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-muted">
        {kind === "image" && item.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.url} alt="" className="size-full object-cover" />
        ) : (
          <FileIcon kind={kind} className="size-12" filled />
        )}
      </div>

      <p className="break-all text-sm font-medium">{item.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{KIND_LABEL[kind]}</p>

      <dl className="mt-4 space-y-2 text-sm">
        {!item.isFolder && <Row label="Dung lượng" value={formatBytes(item.size)} />}
        {!item.isFolder && <Row label="Ngày tạo" value={formatDate(item.createdAt)} />}
        {!item.isFolder && item.currentVersion && <Row label="Phiên bản hiện tại" value={`v${item.currentVersion}`} />}
        {item.mimeType && <Row label="Định dạng" value={item.mimeType} />}
        {folderPath && <Row label="Thư mục" value={`/${folderPath}`} />}
      </dl>

      <div className="mt-5 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => onOpen(item)}>
          {item.isFolder ? "Mở thư mục" : "Xem trước"}
        </Button>

        {item.url && !item.isFolder && (
          <a
            href={item.url}
            download={item.name}
            aria-label="Tải về"
            className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            <Download className="size-4" />
          </a>
        )}
        {!item.isFolder && canRead && canUpload && ["text", "code"].includes(kind) && (
          <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
            <Pencil className="size-4" /> Sửa
          </Button>
        )}
      </div>

      {!item.isFolder && item.storedName && item.currentVersionId && (
        <div className="mt-5 border-t pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Lịch sử phiên bản</p>
            {canUpload && (
              <>
                <input
                  ref={versionUploadRef}
                  type="file"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUploadVersion(item.storedName!, item.currentVersionId!, file);
                    event.target.value = "";
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => versionUploadRef.current?.click()}>
                  <FileUp /> Bản mới
                </Button>
              </>
            )}
          </div>
          <div className="space-y-2">
            {item.versions?.map((version) => {
              const isCurrent = version.id === item.currentVersionId;
              return (
                <div key={version.id} className="rounded-md border p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">v{version.versionNumber}{isCurrent ? " · hiện tại" : ""}</span>
                    <span className="text-muted-foreground">{formatBytes(version.size)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{formatDate(version.createdAt)}{version.actorUsername ? ` · ${version.actorUsername}` : ""}</p>
                  <div className="mt-2 flex gap-2">
                    {canRead && <a className="text-primary hover:underline" href={`/api/files/${encodeURIComponent(item.storedName!)}/versions/${encodeURIComponent(version.id)}?folderId=${encodeURIComponent(folderId)}`}>Tải</a>}
                    {canRead && canUpload && !isCurrent && <button type="button" className="text-primary hover:underline" onClick={() => {
                      if (window.confirm(`Khôi phục phiên bản v${version.versionNumber} thành phiên bản mới?`)) {
                        void onRestoreVersion(item.storedName!, version.id, item.currentVersionId!);
                      }
                    }}>Khôi phục</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
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

function Placeholder({
  icon,
  title,
  body,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="grid h-full min-h-80 place-items-center p-8 text-center">
      <div className="max-w-xs">
        {icon ?? <FileIcon kind="folder" className="mx-auto mb-3 size-12" filled />}
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
