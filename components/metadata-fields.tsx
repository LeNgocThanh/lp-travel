"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MetadataType = "string" | "number" | "boolean" | "json";
type MetadataRow = { id: number; key: string; type: MetadataType; value: string };

function initialRows(metadata: unknown): MetadataRow[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  return Object.entries(metadata).map(([key, value], id) => ({
    id, key,
    type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : typeof value === "string" ? "string" : "json",
    value: typeof value === "string" ? value : JSON.stringify(value)
  }));
}

export function MetadataFields({ metadata, prefix }: { metadata?: unknown; prefix: string }) {
  const [rows, setRows] = useState(() => initialRows(metadata));
  const [nextId, setNextId] = useState(() => initialRows(metadata).length);

  function update(id: number, changes: Partial<MetadataRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  }

  return <fieldset className="space-y-3 border-t pt-4 md:col-span-2"><legend className="font-medium">Thông tin bổ sung (metadata)</legend><p className="text-sm text-muted-foreground">Thêm từng cặp khóa–giá trị. Dùng kiểu JSON nâng cao nếu giá trị là danh sách hoặc đối tượng.</p>
    {rows.map((row) => <div key={row.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_140px_2fr_auto] md:items-end">
      <div><Label htmlFor={`${prefix}-metadata-key-${row.id}`}>Key</Label><Input id={`${prefix}-metadata-key-${row.id}`} name="metadataKey" value={row.key} onChange={(event) => update(row.id, { key: event.target.value })} maxLength={80} required /></div>
      <div><Label htmlFor={`${prefix}-metadata-type-${row.id}`}>Kiểu</Label><select id={`${prefix}-metadata-type-${row.id}`} name="metadataType" value={row.type} onChange={(event) => update(row.id, { type: event.target.value as MetadataType, value: "" })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="string">Văn bản</option><option value="number">Số</option><option value="boolean">Đúng/Sai</option><option value="json">JSON nâng cao</option></select></div>
      <div><Label htmlFor={`${prefix}-metadata-value-${row.id}`}>Value</Label>{row.type === "boolean" ? <select id={`${prefix}-metadata-value-${row.id}`} name="metadataValue" value={row.value || "false"} onChange={(event) => update(row.id, { value: event.target.value })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="false">Sai</option><option value="true">Đúng</option></select> : row.type === "json" ? <Textarea id={`${prefix}-metadata-value-${row.id}`} name="metadataValue" value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} required /> : <Input id={`${prefix}-metadata-value-${row.id}`} name="metadataValue" type={row.type === "number" ? "number" : "text"} step={row.type === "number" ? "any" : undefined} value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} required={row.type === "number"} />}</div>
      <Button type="button" variant="outline" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>Xóa</Button>
    </div>)}
    <Button type="button" variant="outline" disabled={rows.length >= 50} onClick={() => { setRows((current) => [...current, { id: nextId, key: "", type: "string", value: "" }]); setNextId((value) => value + 1); }}>Thêm trường</Button>
  </fieldset>;
}
