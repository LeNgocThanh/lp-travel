"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileItem } from "@/types/file";

async function jsonApi(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

export function FileEditor({ file, folderId, onClose, onSaved }: {
  file: FileItem;
  folderId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [baseVersionId, setBaseVersionId] = useState("");
  const [currentVersionId, setCurrentVersionId] = useState("");
  const [lockToken, setLockToken] = useState("");
  const [status, setStatus] = useState("Đang mở editor…");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState("");
  const [comparison, setComparison] = useState<{ left: { versionNumber: number; content: string }; right: { versionNumber: number; content: string } } | null>(null);
  const lockRef = useRef("");
  const baseUrl = `/api/files/${encodeURIComponent(file.storedName!)}`;

  const release = useCallback(async () => {
    const token = lockRef.current;
    lockRef.current = "";
    if (!token) return;
    await fetch(`${baseUrl}/edit-lock?folderId=${encodeURIComponent(folderId)}`, { method: "DELETE", headers: { "X-Edit-Lock": token } }).catch(() => undefined);
  }, [baseUrl, folderId]);

  useEffect(() => {
    let cancelled = false;
    async function open() {
      try {
        const lock = await jsonApi(`${baseUrl}/edit-lock?folderId=${encodeURIComponent(folderId)}`, { method: "POST" });
        if (cancelled) return;
        lockRef.current = lock.lockToken;
        setLockToken(lock.lockToken);
        const data = await jsonApi(`${baseUrl}/edit?folderId=${encodeURIComponent(folderId)}`);
        if (cancelled) return;
        setContent(data.content);
        setCurrentContent(data.currentContent);
        setCurrentVersionId(data.currentVersionId);
        setBaseVersionId(data.draft?.baseVersionId || data.currentVersionId);
        setStatus(data.draft ? "Đã phục hồi bản nháp." : "Đã khóa file để chỉnh sửa.");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    void open();
    return () => { cancelled = true; void release(); };
  }, [baseUrl, folderId, release]);

  useEffect(() => {
    if (!lockToken) return;
    const timer = window.setInterval(() => {
      void jsonApi(`${baseUrl}/edit-lock?folderId=${encodeURIComponent(folderId)}`, { method: "PATCH", headers: { "X-Edit-Lock": lockToken } })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [baseUrl, folderId, lockToken]);

  useEffect(() => {
    if (!dirty || !lockToken || !baseVersionId) return;
    const timer = window.setTimeout(() => {
      setStatus("Đang lưu bản nháp…");
      void jsonApi(`${baseUrl}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Edit-Lock": lockToken },
        body: JSON.stringify({ folderId, content, baseVersionId })
      }).then(() => { setDirty(false); setStatus("Đã tự động lưu bản nháp."); })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [baseUrl, baseVersionId, content, dirty, folderId, lockToken]);

  async function save() {
    try {
      setStatus("Đang tạo phiên bản mới…");
      await jsonApi(`${baseUrl}/edit/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Edit-Lock": lockToken, "If-Match": currentVersionId },
        body: JSON.stringify({ folderId, content })
      });
      lockRef.current = "";
      await onSaved();
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function compare() {
    if (!compareVersionId || !currentVersionId) return;
    try {
      const params = new URLSearchParams({ folderId, left: compareVersionId, right: currentVersionId });
      const data = await jsonApi(`${baseUrl}/versions/compare?${params}`);
      setComparison({ left: data.left, right: data.right });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  const staleDraft = Boolean(baseVersionId && currentVersionId && baseVersionId !== currentVersionId);

  return <div role="dialog" aria-modal="true" aria-label={`Chỉnh sửa ${file.name}`} className="fixed inset-0 z-50 flex bg-black/70 p-3 sm:p-6">
    <div className="mx-auto flex size-full max-w-7xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1"><p className="truncate font-medium">Chỉnh sửa {file.name}</p><p className="text-xs text-muted-foreground">{status}</p></div>
        <Button variant="ghost" size="icon-sm" onClick={() => { void release().finally(onClose); }} aria-label="Đóng"><X /></Button>
      </header>
      {error && <div className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}
      {staleDraft && <div className="flex items-center justify-between gap-3 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900"><span>Bản nháp dựa trên version cũ và không thể ghi đè version hiện tại.</span><Button size="sm" variant="outline" onClick={() => { setContent(currentContent); setBaseVersionId(currentVersionId); setDirty(true); setError(""); }}>Dùng nội dung hiện tại</Button></div>}
      {!lockToken && !error ? <div className="grid flex-1 place-items-center"><LoaderCircle className="animate-spin" /></div> : <textarea value={content} onChange={(event) => { setContent(event.target.value); setDirty(true); setStatus("Có thay đổi chưa lưu."); }} spellCheck={false} className="min-h-0 flex-1 resize-none bg-background p-4 font-mono text-sm outline-none" />}
      <section className="border-t p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={compareVersionId} onChange={(event) => setCompareVersionId(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Chọn version để so sánh</option>{file.versions?.filter((version) => version.id !== currentVersionId).map((version) => <option key={version.id} value={version.id}>v{version.versionNumber}</option>)}</select>
          <Button variant="outline" size="sm" disabled={!compareVersionId} onClick={() => void compare()}>So sánh</Button>
          <div className="ml-auto flex gap-2"><Button variant="outline" onClick={() => { void release().finally(onClose); }}>Đóng</Button><Button disabled={!lockToken || staleDraft} onClick={() => void save()}>Lưu phiên bản mới</Button></div>
        </div>
        {comparison && <div className="mt-3 grid max-h-64 grid-cols-2 gap-3 overflow-auto"><pre className="overflow-auto rounded-md bg-muted p-3 text-xs">v{comparison.left.versionNumber}{"\n"}{comparison.left.content}</pre><pre className="overflow-auto rounded-md bg-muted p-3 text-xs">v{comparison.right.versionNumber}{"\n"}{comparison.right.content}</pre></div>}
      </section>
    </div>
  </div>;
}
