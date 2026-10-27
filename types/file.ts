/* Khớp đúng response của API hiện có */

export type Folder = {
  id: string;
  name: string;
  path: string;
  canUpload: boolean;
  canList: boolean;
  canRead: boolean;
  canDelete: boolean;
  canCreateFolder: boolean;
};

export type StoredFile = {
  id: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  currentVersion: number;
  currentVersionId?: string;
  versions: FileVersion[];
};

export type FileVersion = {
  id: string;
  versionNumber: number;
  mimeType: string;
  size: number;
  checksumSha256: string | null;
  actorId: string | null;
  actorUsername: string | null;
  createdAt: string;
};

export type FileKind =
  | "folder"
  | "image"
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "text"
  | "other";

export type ViewMode = "grid" | "list" | "gallery";
export type SortKey = "name" | "size" | "createdAt" | "kind";
export type SortDir = "asc" | "desc";

/** Một dòng trong lưới: có thể là thư mục con hoặc một file */
export type FileItem = {
  key: string;
  name: string;
  isFolder: boolean;
  /** chỉ có khi isFolder — id để điều hướng vào trong */
  folderId?: string;
  storedName?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  currentVersion?: number;
  currentVersionId?: string;
  versions?: FileVersion[];
  /** đường dẫn tải/xem, chỉ sinh ra khi thư mục có quyền canRead */
  url?: string;
  /** đường dẫn tải xuống có kiểm tra quyền */
  downloadUrl?: string;
};
