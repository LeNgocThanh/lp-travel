"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function InvoiceDueDateInput({ initialValue, dateConfirmation }: { initialValue: string; dateConfirmation: string }) {
  const [value, setValue] = useState(initialValue);
  return <label className="space-y-1 text-sm font-medium">Due Date<Input name="dueDate" type="date" value={value} onChange={(event) => setValue(event.target.value)} />{!dateConfirmation ? <span className="block text-xs text-amber-700">Lead chưa có Date Confirmation. Vui lòng kiểm tra và nhập Due Date.</span> : value !== dateConfirmation ? <span className="block text-xs text-amber-700">Due Date đang khác Date Confirmation ({dateConfirmation}).</span> : null}</label>;
}
