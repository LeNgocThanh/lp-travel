"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Activity = {
  id: string;
  action: string;
  actorId: string | null;
  actorUsername: string | null;
  actorType: string;
  originalName: string | null;
  storedName: string | null;
  createdAt: string;
  ipAddress: string | null;
  folder: { id: string; path: string } | null;
  fileVersion: { id: string; versionNumber: number } | null;
  user: { id: string; fullName: string; username: string; active: boolean } | null;
};
type Folder = { id: string; name: string; path: string };

const ACTION_LABELS: Record<string, string> = {
  FILE_UPLOAD: "Upload file",
  FILE_VERSION_UPLOAD: "Upload phiên bản",
  FILE_EDIT_SAVE: "Chỉnh sửa trực tuyến",
  FILE_DOWNLOAD: "Download/preview",
  FILE_DELETE: "Xóa file",
  FILE_RESTORE: "Khôi phục file",
  FILE_PURGE: "Xóa vĩnh viễn",
  VERSION_DOWNLOAD: "Tải phiên bản",
  VERSION_RESTORE: "Khôi phục phiên bản",
};

async function jsonApi(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không thể tải lịch sử hoạt động");
  return data;
}

export function AdminActivity() {
  const [events, setEvents] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (filter = "", nextPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filter);
      params.set("page", String(nextPage));
      const data = await jsonApi(`/api/admin/activity?${params.toString()}`);
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
      setFolders(data.folders ?? []);
      setPage(data.page ?? nextPage);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["action", "actor", "file", "folderId", "from", "to"]) {
      const value = String(form.get(key) || "").trim();
      if (value) params.set(key, value);
    }
    const value = params.toString();
    setQuery(value);
    void load(value, 1);
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Lịch sử hoạt động</h1><p className="mt-1 text-muted-foreground">Theo dõi thao tác file của toàn bộ user thuộc LP Travel.</p></div>
    <Card>
      <CardHeader><CardTitle>Bộ lọc</CardTitle><CardDescription>Kết quả luôn được giới hạn trong API token và phạm vi folder của LP Travel.</CardDescription></CardHeader>
      <CardContent><form onSubmit={filter} className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium">Hành động<select name="action" className="mt-1 h-9 w-full rounded-md border bg-background px-3 font-normal"><option value="">Tất cả</option>{Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-medium">User<Input name="actor" className="mt-1" placeholder="Username hoặc ID" /></label>
        <label className="text-sm font-medium">File<Input name="file" className="mt-1" placeholder="Tên file" /></label>
        <label className="text-sm font-medium">Thư mục<select name="folderId" className="mt-1 h-9 w-full rounded-md border bg-background px-3 font-normal"><option value="">Tất cả</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path || "/"}</option>)}</select></label>
        <label className="text-sm font-medium">Từ lúc<Input name="from" type="datetime-local" className="mt-1" /></label>
        <label className="text-sm font-medium">Đến lúc<Input name="to" type="datetime-local" className="mt-1" /></label>
        <Button type="submit" className="md:col-start-3">Lọc lịch sử</Button>
      </form></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{total} sự kiện</CardTitle><CardDescription>{loading ? "Đang tải dữ liệu…" : "Các sự kiện mới nhất được hiển thị trước."}</CardDescription></CardHeader>
      <CardContent>
        {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Table><TableHeader><TableRow><TableHead>Thời gian</TableHead><TableHead>Người dùng</TableHead><TableHead>Hành động</TableHead><TableHead>File</TableHead><TableHead>Folder</TableHead><TableHead>Version</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
          <TableBody>{events.map((item) => <TableRow key={item.id}>
            <TableCell>{new Date(item.createdAt).toLocaleString("vi-VN")}</TableCell>
            <TableCell><div className="font-medium">{item.user?.fullName || item.actorUsername || item.actorType}</div><div className="text-xs text-muted-foreground">{item.user?.username || item.actorId || "-"}{item.user && !item.user.active ? " · đã khóa" : ""}</div></TableCell>
            <TableCell>{ACTION_LABELS[item.action] || item.action}</TableCell>
            <TableCell>{item.originalName || item.storedName || "-"}</TableCell>
            <TableCell>/{item.folder?.path || ""}</TableCell>
            <TableCell>{item.fileVersion ? `v${item.fileVersion.versionNumber}` : "-"}</TableCell>
            <TableCell>{item.ipAddress || "-"}</TableCell>
          </TableRow>)}{!loading && !events.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Chưa có hoạt động phù hợp.</TableCell></TableRow>}</TableBody>
        </Table>
        {total > 50 && <div className="mt-4 flex items-center justify-end gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => void load(query, page - 1)}>Trang trước</Button><span className="text-sm">Trang {page} / {Math.ceil(total / 50)}</span><Button variant="outline" disabled={page * 50 >= total} onClick={() => void load(query, page + 1)}>Trang sau</Button></div>}
      </CardContent>
    </Card>
  </div>;
}
