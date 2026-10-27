"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Eye } from "lucide-react";
import { FilePreview } from "@/components/files/file-preview";
import { Button } from "@/components/ui/button";
import type { FileItem } from "@/types/file";

export function TravelFileViewer({ url, downloadUrl, name = "File", mimeType, size, createdAt, className }: { url: string; downloadUrl?: string; name?: string; mimeType?: string; size?: number; createdAt?: string; className?: string }) {
  const [previewing, setPreviewing] = useState(false);
  const file = useMemo<FileItem>(() => ({ key: url, name, isFolder: false, storedName: name, mimeType, size, createdAt, url, downloadUrl: downloadUrl || `${url}${url.includes("?") ? "&" : "?"}download=1` }), [url, downloadUrl, name, mimeType, size, createdAt]);
  return <div className={className}>
    <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={() => setPreviewing(true)}><Eye />Xem trước</Button><Button nativeButton={false} variant="outline" render={<a href={url} target="_blank" rel="noreferrer" />}><ExternalLink />Mở file</Button><Button nativeButton={false} render={<a href={file.downloadUrl} download={name} />}><Download />Tải xuống</Button></div>
    {previewing && <FilePreview file={file} siblings={[file]} onClose={() => setPreviewing(false)} onNavigate={() => undefined} />}
  </div>;
}
