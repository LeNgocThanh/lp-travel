"use client";

import { useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TravelFileResource } from "@/types/travel-file";

export function TravelFileUpload({ folder, accept, disabled, onUploaded, onError }: { folder: string; accept?: string; disabled?: boolean; onUploaded?: (file: TravelFileResource) => void; onError?: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState<TravelFileResource | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) { setError("Vui lòng chọn file."); return; }
    setPending(true); setError("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch(`/api/travel-files?folder=${encodeURIComponent(folder)}`, { method: "POST", body: form });
      const body = await response.json() as Partial<TravelFileResource> & { ok?: boolean; message?: string; storedName?: string };
      if (!response.ok) throw new Error(body.message || "Không thể upload file.");
      if (!body.url || !body.viewUrl || !body.downloadUrl) throw new Error("API không trả về URL của file.");
      const result: TravelFileResource = { id: body.id, filename: body.filename || body.storedName || file.name, originalName: body.originalName || file.name, mimeType: body.mimeType || file.type, size: body.size ?? file.size, createdAt: body.createdAt, url: body.url, viewUrl: body.viewUrl, downloadUrl: body.downloadUrl };
      setUploaded(result); if (inputRef.current) inputRef.current.value = ""; onUploaded?.(result);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Không thể upload file.";
      setError(message); onError?.(message);
    } finally { setPending(false); }
  }

  return <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4">
    <div><p className="font-medium">Upload file</p><p className="text-xs text-muted-foreground">Thư mục đích: Travel/{folder}</p></div>
    <div className="flex flex-col gap-2 sm:flex-row"><Input ref={inputRef} type="file" accept={accept} disabled={disabled || pending} className="flex-1" /><Button type="submit" disabled={disabled || pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Upload />}{pending ? "Đang upload..." : "Upload"}</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {uploaded && !error && <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="size-4" />Đã upload {uploaded.originalName}</p>}
  </form>;
}
