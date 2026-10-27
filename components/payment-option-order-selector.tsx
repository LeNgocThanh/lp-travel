"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Option = { id: string; name: string };

export function PaymentOptionOrderSelector({ options, initialIds }: { options: Option[]; initialIds: string[] }) {
  const optionIds = new Set(options.map((item) => item.id));
  const [selectedIds, setSelectedIds] = useState(() => initialIds.filter((id) => optionIds.has(id)));
  const selected = selectedIds.map((id) => options.find((item) => item.id === id)).filter((item): item is Option => !!item);
  const unselected = options.filter((item) => !selectedIds.includes(item.id));

  function toggle(id: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  }

  function move(index: number, offset: -1 | 1) {
    setSelectedIds((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return <div className="space-y-2 text-sm md:col-span-2">
    <p className="font-medium">Payment Options</p>
    {selectedIds.map((id) => <input key={id} type="hidden" name="paymentOptionId" value={id} />)}
    <div className="space-y-2">
      {selected.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
        <input type="checkbox" checked onChange={(event) => toggle(item.id, event.target.checked)} aria-label={`Chọn ${item.name}`} />
        <span className="min-w-0 flex-1 font-normal"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{item.name}</span>
        <button type="button" className="rounded p-1 hover:bg-muted disabled:opacity-30" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Đưa ${item.name} lên`}><ChevronUp className="size-4" /></button>
        <button type="button" className="rounded p-1 hover:bg-muted disabled:opacity-30" disabled={index === selected.length - 1} onClick={() => move(index, 1)} aria-label={`Đưa ${item.name} xuống`}><ChevronDown className="size-4" /></button>
      </div>)}
      {unselected.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-md border px-3 py-2 font-normal text-muted-foreground"><input type="checkbox" checked={false} onChange={(event) => toggle(item.id, event.target.checked)} />{item.name}</label>)}
    </div>
    {options.length === 0 && <p className="text-muted-foreground">Chưa có Payment Option đang hoạt động.</p>}
    {selected.length > 1 && <p className="text-xs text-muted-foreground">Dùng nút lên/xuống để sắp xếp thứ tự hiển thị.</p>}
  </div>;
}
