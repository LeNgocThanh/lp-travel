"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function OvernightFields({ checkboxName, inputName, defaultChecked = false, defaultValue = "" }: { checkboxName: string; inputName: string; defaultChecked?: boolean; defaultValue?: string }) {
  const [checked, setChecked] = useState(defaultChecked);
  const [value, setValue] = useState(defaultValue);
  return <div className="space-y-2 md:col-span-2"><label className="flex items-center gap-2 text-sm font-medium"><input name={checkboxName} type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />Overnight</label>{checked && <label className="block space-y-1.5 text-sm font-medium">Địa điểm nghỉ đêm<Input name={inputName} value={value} onChange={(event) => setValue(event.target.value)} maxLength={200} placeholder="Ví dụ: Ho Chi Minh City" required /></label>}</div>;
}
