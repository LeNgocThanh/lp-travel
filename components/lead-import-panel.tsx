"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";
import { LeadImportForm } from "@/components/lead-import-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LeadImportPanel() {
  const [open, setOpen] = useState(false);
  return <div className="space-y-3"><Button type="button" variant="outline" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="lead-import-panel"><Upload />Import Excel{open ? <ChevronUp /> : <ChevronDown />}</Button>{open && <Card id="lead-import-panel"><CardHeader><CardTitle>Import Lead từ Excel</CardTitle><CardDescription>Tải mẫu, giữ nguyên tên cột rồi chọn file `.xlsx` tối đa 10 MB và 2.000 dòng.</CardDescription></CardHeader><CardContent><LeadImportForm /></CardContent></Card>}</div>;
}
