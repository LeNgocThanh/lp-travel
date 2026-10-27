"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { TemplateBuilderBlockPreview } from "@/components/template-builder-block-preview";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUILDER_BUSINESS_BLOCKS, BUILDER_DATASETS, BUILDER_VARIABLES, type BuilderBlock, type BuilderMetadata, type BuilderPageSettings, type BuilderSchema } from "@/lib/template-builder";

type MetadataRow = { id: string; key: string; type: "string" | "number" | "boolean"; value: string };
type VariableOption = { value: string; label: string; sample: string };
type DatasetOption = { value: string; label: string; columns: { value: string; label: string }[] };
type Props = { action: (formData: FormData) => unknown | Promise<unknown>; documentType: string; initialSchema: BuilderSchema; initialMetadata: BuilderMetadata; variableOptions?: VariableOption[]; datasetOptions?: DatasetOption[]; readOnly?: boolean };

const basicBlockLabels: { type: BuilderBlock["type"]; label: string }[] = [{ type: "heading", label: "Tiêu đề" }, { type: "text", label: "Văn bản" }, { type: "field", label: "Trường dữ liệu" }, { type: "divider", label: "Đường phân cách" }, { type: "spacer", label: "Khoảng trắng" }, { type: "repeater", label: "Bảng lặp" }];
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const defaultPage: BuilderPageSettings = { size: "A4", orientation: "portrait", margin: 24, fontFamily: "Arial", fontSize: 11 };

function newBlock(type: BuilderBlock["type"], documentType: string): BuilderBlock {
  const variable = BUILDER_VARIABLES[documentType]?.[0]?.value;
  const dataset = BUILDER_DATASETS[documentType]?.[0];
  if (type === "heading") return { id: makeId(), type, content: "Tiêu đề mới", level: 2, align: "left", color: "#111827" };
  if (type === "text") return { id: makeId(), type, content: "Nội dung văn bản", align: "left", color: "#111827" };
  if (type === "field") return { id: makeId(), type, label: "Nhãn", variable, showLabel: true, align: "left" };
  if (type === "divider") return { id: makeId(), type, thickness: 1, style: "solid", color: "#d1d5db" };
  if (type === "spacer") return { id: makeId(), type, height: 24 };
  if (type === "repeater") return { id: makeId(), type, dataset: dataset?.value, columns: dataset?.columns.slice(0, 3).map((column) => column.value) ?? [] };
  return { id: makeId(), type, marginTop: 8 };
}

function metadataRows(metadata: BuilderMetadata): MetadataRow[] {
  return Object.entries(metadata).map(([key, value]) => ({ id: makeId(), key, type: typeof value as MetadataRow["type"], value: String(value) }));
}

export function TemplateBuilderEditor({ action, documentType, initialSchema, initialMetadata, variableOptions, datasetOptions, readOnly = false }: Props) {
  const [blocks, setBlocks] = useState<BuilderBlock[]>(initialSchema.blocks ?? []);
  const [page, setPage] = useState<BuilderPageSettings>(initialSchema.page ?? defaultPage);
  const [selectedId, setSelectedId] = useState<string | null>(initialSchema.blocks?.[0]?.id ?? null);
  const [metadata, setMetadata] = useState<MetadataRow[]>(() => metadataRows(initialMetadata));
  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const variables = variableOptions ?? BUILDER_VARIABLES[documentType] ?? [];
  const datasets = datasetOptions ?? BUILDER_DATASETS[documentType] ?? [];
  const schemaJson = useMemo(() => JSON.stringify({ page, blocks }), [page, blocks]);
  const metadataJson = useMemo(() => JSON.stringify(Object.fromEntries(metadata.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.type === "number" ? Number(row.value) : row.type === "boolean" ? row.value === "true" : row.value]))), [metadata]);

  const updateBlock = (changes: Partial<BuilderBlock>) => setBlocks((current) => current.map((block) => block.id === selectedId ? { ...block, ...changes } : block));
  const move = (index: number, direction: -1 | 1) => setBlocks((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const remove = (id: string) => { setBlocks((current) => current.filter((block) => block.id !== id)); if (selectedId === id) setSelectedId(null); };
  const add = (type: BuilderBlock["type"]) => { const block = newBlock(type, documentType); setBlocks((current) => [...current, block]); setSelectedId(block.id); };

  return <WorkCaseActionForm action={action} className="space-y-6">
    <fieldset disabled={readOnly} className="contents">
    <input type="hidden" name="schemaJson" value={schemaJson} />
    <input type="hidden" name="metadataJson" value={metadataJson} />
    <Card className="gap-4 p-4"><div><h2 className="font-semibold">Thiết lập trang</h2><p className="text-sm text-muted-foreground">Áp dụng cho vùng xem trước và cấu trúc xuất file sau này.</p></div><div className="grid gap-3 md:grid-cols-5"><label className="space-y-1 text-sm"><span>Khổ giấy</span><select className="h-9 w-full rounded-md border px-2" value={page.size} onChange={(event) => setPage({ ...page, size: event.target.value as "A4" })}><option value="A4">A4</option></select></label><label className="space-y-1 text-sm"><span>Hướng giấy</span><select className="h-9 w-full rounded-md border px-2" value={page.orientation} onChange={(event) => setPage({ ...page, orientation: event.target.value as BuilderPageSettings["orientation"] })}><option value="portrait">Dọc</option><option value="landscape">Ngang</option></select></label><label className="space-y-1 text-sm"><span>Lề trang (px)</span><Input type="number" min={0} max={80} value={page.margin} onChange={(event) => setPage({ ...page, margin: Number(event.target.value) })} /></label><label className="space-y-1 text-sm"><span>Font</span><select className="h-9 w-full rounded-md border px-2" value={page.fontFamily} onChange={(event) => setPage({ ...page, fontFamily: event.target.value as BuilderPageSettings["fontFamily"] })}><option>Arial</option><option>Times New Roman</option><option>Calibri</option></select></label><label className="space-y-1 text-sm"><span>Cỡ chữ</span><Input type="number" min={8} max={24} value={page.fontSize} onChange={(event) => setPage({ ...page, fontSize: Number(event.target.value) })} /></label></div></Card>
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
      <Card className="h-fit gap-3 p-4"><h2 className="font-semibold">Khối nội dung</h2>{basicBlockLabels.map((item) => <Button key={item.type} type="button" variant="outline" className="justify-start" disabled={(item.type === "field" && !variables.length) || (item.type === "repeater" && !datasets.length)} onClick={() => add(item.type)}><Plus />{item.label}</Button>)}{!!BUILDER_BUSINESS_BLOCKS[documentType]?.length && <><div className="my-1 border-t" /><h3 className="text-sm font-semibold">Khối nghiệp vụ</h3>{BUILDER_BUSINESS_BLOCKS[documentType].map((item) => <Button key={item.type} type="button" variant="outline" className="h-auto justify-start whitespace-normal text-left" onClick={() => add(item.type)}><Plus />{item.label}</Button>)}</>}</Card>

      <Card className="min-h-[650px] gap-3 overflow-x-auto bg-slate-100 p-4"><div className="rounded-md border bg-white px-5 py-4 text-center text-xs text-muted-foreground">Xem trước trực tiếp · A4 {page.orientation === "portrait" ? "dọc" : "ngang"}</div><div className="mx-auto min-h-[540px] bg-white shadow-sm" style={{ width: page.orientation === "portrait" ? 760 : 1075, padding: page.margin, fontFamily: page.fontFamily, fontSize: page.fontSize }}>
        {!blocks.length && <p className="py-20 text-center text-sm text-muted-foreground">Chọn một khối bên trái để bắt đầu thiết kế.</p>}
        {blocks.map((block, index) => <div key={block.id} role="button" tabIndex={0} onClick={() => setSelectedId(block.id)} onKeyDown={(event) => event.key === "Enter" && setSelectedId(block.id)} className={`group relative rounded border p-2 ${selectedId === block.id ? "border-sky-500 ring-2 ring-sky-100" : "border-transparent hover:border-slate-300"}`}>
          <div className="absolute right-1 top-1 z-10 hidden gap-1 rounded bg-white p-1 shadow group-hover:flex">
            <button type="button" aria-label="Đưa lên" disabled={!index} onClick={(event) => { event.stopPropagation(); move(index, -1); }}><ArrowUp className="size-4" /></button>
            <button type="button" aria-label="Đưa xuống" disabled={index === blocks.length - 1} onClick={(event) => { event.stopPropagation(); move(index, 1); }}><ArrowDown className="size-4" /></button>
            <button type="button" aria-label="Nhân bản" onClick={(event) => { event.stopPropagation(); const copy = { ...block, id: makeId() }; setBlocks((current) => [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]); setSelectedId(copy.id); }}><Copy className="size-4" /></button>
            <button type="button" aria-label="Xóa" onClick={(event) => { event.stopPropagation(); remove(block.id); }}><Trash2 className="size-4 text-red-600" /></button>
          </div>
          <TemplateBuilderBlockPreview block={block} documentType={documentType} />
        </div>)}
      </div></Card>

      <Card className="h-fit gap-4 p-4"><h2 className="font-semibold">Thuộc tính</h2>{!selected && <p className="text-sm text-muted-foreground">Chọn một khối trong vùng xem trước.</p>}
        {selected?.type === "heading" && <><Label>Nội dung</Label><Input value={selected.content ?? ""} onChange={(event) => updateBlock({ content: event.target.value })} /><Label>Cấp tiêu đề</Label><select className="h-9 rounded-md border px-2" value={selected.level ?? 2} onChange={(event) => updateBlock({ level: Number(event.target.value) as 1 | 2 | 3 })}><option value="1">H1</option><option value="2">H2</option><option value="3">H3</option></select></>}
        {selected?.type === "text" && <><Label>Nội dung</Label><Textarea value={selected.content ?? ""} onChange={(event) => updateBlock({ content: event.target.value })} /></>}
        {(selected?.type === "heading" || selected?.type === "text") && <><Label>Căn lề</Label><select className="h-9 rounded-md border px-2" value={selected.align ?? "left"} onChange={(event) => updateBlock({ align: event.target.value as BuilderBlock["align"] })}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select><Label>Màu chữ</Label><Input type="color" value={selected.color ?? "#111827"} onChange={(event) => updateBlock({ color: event.target.value })} /></>}
        {selected?.type === "field" && <><Label>Nhãn</Label><Input value={selected.label ?? ""} onChange={(event) => updateBlock({ label: event.target.value })} /><Label>Trường dữ liệu</Label><select className="h-9 rounded-md border px-2" value={selected.variable ?? ""} onChange={(event) => updateBlock({ variable: event.target.value })}>{variables.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><label className="flex items-center gap-2 text-sm"><Checkbox checked={selected.showLabel ?? false} onCheckedChange={(checked) => updateBlock({ showLabel: checked === true })} />Hiện nhãn</label></>}
        {selected?.type === "divider" && <><Label>Độ dày</Label><Input type="number" min={1} max={10} value={selected.thickness ?? 1} onChange={(event) => updateBlock({ thickness: Number(event.target.value) })} /><Label>Kiểu đường</Label><select className="h-9 rounded-md border px-2" value={selected.style ?? "solid"} onChange={(event) => updateBlock({ style: event.target.value as BuilderBlock["style"] })}><option value="solid">Liền</option><option value="dashed">Nét đứt</option><option value="dotted">Chấm</option></select><Label>Màu</Label><Input type="color" value={selected.color ?? "#d1d5db"} onChange={(event) => updateBlock({ color: event.target.value })} /></>}
        {selected?.type === "spacer" && <><Label>Chiều cao (px)</Label><Input type="number" min={4} max={200} value={selected.height ?? 24} onChange={(event) => updateBlock({ height: Number(event.target.value) })} /></>}
        {selected?.type === "repeater" && <><Label>Nguồn dữ liệu</Label><select className="h-9 rounded-md border px-2" value={selected.dataset ?? ""} onChange={(event) => { const dataset = datasets.find((item) => item.value === event.target.value); updateBlock({ dataset: event.target.value, columns: dataset?.columns.slice(0, 3).map((column) => column.value) ?? [] }); }}>{datasets.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Label>Cột hiển thị</Label><div className="space-y-2">{datasets.find((item) => item.value === selected.dataset)?.columns.map((column) => <label key={column.value} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.columns?.includes(column.value) ?? false} onCheckedChange={(checked) => updateBlock({ columns: checked ? [...(selected.columns ?? []), column.value] : selected.columns?.filter((item) => item !== column.value) })} />{column.label}</label>)}</div></>}
        {selected && selected.type !== "spacer" && selected.type !== "divider" && <><div className="border-t" /><h3 className="text-sm font-semibold">Kiểu hiển thị chung</h3><Label>Khoảng cách phía trên</Label><Input type="number" min={0} max={200} value={selected.marginTop ?? 0} onChange={(event) => updateBlock({ marginTop: Number(event.target.value) })} /><Label>Khoảng đệm</Label><Input type="number" min={0} max={80} value={selected.padding ?? 0} onChange={(event) => updateBlock({ padding: Number(event.target.value) })} /><Label>Màu nền</Label><Input type="color" value={selected.backgroundColor ?? "#ffffff"} onChange={(event) => updateBlock({ backgroundColor: event.target.value })} />{(selected.type === "heading" || selected.type === "text" || selected.type === "field") && <><Label>Cỡ chữ</Label><Input type="number" min={8} max={72} value={selected.fontSize ?? page.fontSize} onChange={(event) => updateBlock({ fontSize: Number(event.target.value) })} /><label className="flex items-center gap-2 text-sm"><Checkbox checked={selected.bold ?? false} onCheckedChange={(checked) => updateBlock({ bold: checked === true })} />In đậm</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={selected.italic ?? false} onCheckedChange={(checked) => updateBlock({ italic: checked === true })} />In nghiêng</label></>}</>}
      </Card>
    </div>

    <Card className="gap-4 p-5"><div><h2 className="font-semibold">Thông tin bổ sung</h2><p className="text-sm text-muted-foreground">Nhập theo từng cặp key–value. Không cần và không thể nhập JSON.</p></div>{metadata.map((row, index) => <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_160px_1fr_auto]"><Input aria-label="Key" placeholder="Key" value={row.key} onChange={(event) => setMetadata((current) => current.map((item) => item.id === row.id ? { ...item, key: event.target.value } : item))} /><select aria-label="Kiểu dữ liệu" className="h-9 rounded-md border px-2" value={row.type} onChange={(event) => setMetadata((current) => current.map((item) => item.id === row.id ? { ...item, type: event.target.value as MetadataRow["type"], value: event.target.value === "boolean" ? "false" : "" } : item))}><option value="string">Văn bản</option><option value="number">Số</option><option value="boolean">Đúng / Sai</option></select>{row.type === "boolean" ? <select aria-label="Giá trị" className="h-9 rounded-md border px-2" value={row.value} onChange={(event) => setMetadata((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))}><option value="true">Đúng</option><option value="false">Sai</option></select> : <Input aria-label="Giá trị" type={row.type === "number" ? "number" : "text"} value={row.value} onChange={(event) => setMetadata((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))} />}<Button type="button" variant="ghost" size="icon" aria-label={`Xóa dòng ${index + 1}`} onClick={() => setMetadata((current) => current.filter((item) => item.id !== row.id))}><Trash2 /></Button></div>)}<Button type="button" variant="outline" className="w-fit" onClick={() => setMetadata((current) => [...current, { id: makeId(), key: "", type: "string", value: "" }])}><Plus />Thêm thông tin</Button></Card>
    {!readOnly && <div className="flex justify-end"><Button type="submit">Lưu bản nháp</Button></div>}
    </fieldset>
  </WorkCaseActionForm>;
}
