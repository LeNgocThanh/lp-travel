"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type InvoiceItemInitial = { description: string; quantity: number; unit: string; amountUsd: string };
type Row = InvoiceItemInitial & { key: number };

export function InvoiceItemsEditor({ initialItems }: { initialItems: InvoiceItemInitial[] }) {
  const [nextKey, setNextKey] = useState(initialItems.length);
  const [rows, setRows] = useState<Row[]>(() => initialItems.map((item, key) => ({ ...item, key })));

  function addItem() {
    setRows((current) => [...current, { key: nextKey, description: "", quantity: 1, unit: "Pax", amountUsd: "0" }]);
    setNextKey((value) => value + 1);
  }

  function update(key: number, field: keyof InvoiceItemInitial, value: string) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: field === "quantity" ? Number(value) : value } : row));
  }

  return <div className="space-y-4 md:col-span-2"><input type="hidden" name="rowCount" value={rows.length} />{rows.map((row, index) => {
    const price = Number(row.quantity) > 0 ? Number(row.amountUsd || 0) / Number(row.quantity) : 0;
    return <div key={row.key} className="grid gap-3 rounded-md border p-4 md:grid-cols-2"><div className="flex items-center justify-between md:col-span-2"><h3 className="font-medium">Item {index + 1}</h3><Button type="button" variant="ghost" size="sm" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 />Xóa</Button></div><label className="space-y-1 text-sm font-medium md:col-span-2">Description<Textarea name={`description_${index}`} value={row.description} onChange={(event) => update(row.key, "description", event.target.value)} required /></label><label className="space-y-1 text-sm font-medium">Qty<Input name={`quantity_${index}`} type="number" min={1} value={row.quantity} onChange={(event) => update(row.key, "quantity", event.target.value)} required /></label><label className="space-y-1 text-sm font-medium">Unit<Input name={`unit_${index}`} value={row.unit} onChange={(event) => update(row.key, "unit", event.target.value)} required /></label><label className="space-y-1 text-sm font-medium">Amount (USD)<Input name={`amountUsd_${index}`} type="number" min={0} step="0.01" value={row.amountUsd} onChange={(event) => update(row.key, "amountUsd", event.target.value)} required /></label><label className="space-y-1 text-sm font-medium">Price/P<Input value={Number.isFinite(price) ? price.toFixed(2) : "0.00"} readOnly /></label></div>;
  })}<Button type="button" variant="outline" onClick={addItem}><Plus />+ Item</Button></div>;
}
