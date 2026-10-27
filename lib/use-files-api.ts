"use client";

import { useCallback, useEffect, useState } from "react";
import type { Folder, StoredFile } from "@/types/file";

async function jsonApi(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

/** Đường dẫn tải/xem một file. Chỉ dùng khi thư mục có quyền canRead. */
export function fileUrl(storedName: string, folderId: string) {
  return `/api/files/${encodeURIComponent(storedName)}?folderId=${encodeURIComponent(folderId)}`;
}

export function useFilesApi() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = folders.find((folder) => folder.id === folderId) ?? null;

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const data = await jsonApi("/api/me/folders");
      const list: Folder[] = data.folders ?? [];
      setFolders(list);
      setFolderId(
        (current) =>
          current || list.find((item) => item.canList)?.id || list[0]?.id || "",
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    if (!folderId || !selected?.canList) {
      setFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const data = await jsonApi(`/api/files?folderId=${encodeURIComponent(folderId)}`);
      setFiles(data.files ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFiles(false);
    }
  }, [folderId, selected?.canList]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  /* ----------------------------- Tác vụ ----------------------------- */

  /** API nhận một file mỗi lần, nên chọn nhiều thì gửi tuần tự */
  const upload = useCallback(
    async (list: File[]) => {
      if (!folderId || !list.length) return;
      try {
        for (const file of list) {
          const body = new FormData();
          body.set("file", file);
          body.set("folderId", folderId);
          await jsonApi("/api/files", { method: "POST", body });
        }
        setNotice(
          list.length === 1 ? "Đã tải file lên." : `Đã tải lên ${list.length} file.`,
        );
        await loadFiles();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [folderId, loadFiles],
  );

  const createFolder = useCallback(
    async (name: string) => {
      try {
        await jsonApi("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, parentId: folderId }),
        });
        setNotice("Đã tạo thư mục.");
        await loadFolders();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [folderId, loadFolders],
  );

  const remove = useCallback(
    async (storedName: string) => {
      try {
        await jsonApi(
          `/api/files/${encodeURIComponent(storedName)}?folderId=${encodeURIComponent(folderId)}`,
          { method: "DELETE" },
        );
        setNotice("Đã xóa file.");
        await loadFiles();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [folderId, loadFiles],
  );

  const uploadVersion = useCallback(
    async (storedName: string, currentVersionId: string, file: File) => {
      try {
        const body = new FormData();
        body.set("file", file);
        body.set("folderId", folderId);
        await jsonApi(`/api/files/${encodeURIComponent(storedName)}/versions`, {
          method: "POST",
          headers: { "If-Match": currentVersionId },
          body,
        });
        setNotice("Đã tải phiên bản mới.");
        await loadFiles();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [folderId, loadFiles],
  );

  const restoreVersion = useCallback(
    async (storedName: string, versionId: string, currentVersionId: string) => {
      try {
        await jsonApi(`/api/files/${encodeURIComponent(storedName)}/versions/${encodeURIComponent(versionId)}/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "If-Match": currentVersionId },
          body: JSON.stringify({ folderId }),
        });
        setNotice("Đã khôi phục thành một phiên bản mới.");
        await loadFiles();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [folderId, loadFiles],
  );

  return {
    folders,
    folderId,
    setFolderId,
    selected,
    files,
    loadingFolders,
    loadingFiles,
    error,
    notice,
    dismiss: () => {
      setError("");
      setNotice("");
    },
    reloadFiles: loadFiles,
    upload,
    createFolder,
    remove,
    uploadVersion,
    restoreVersion,
  };
}
