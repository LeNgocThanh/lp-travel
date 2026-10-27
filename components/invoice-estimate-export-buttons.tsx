"use client";

import Link from "next/link";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InvoiceEstimateExportButtons({ leadId, b2b = false }: { leadId: string; b2b?: boolean }) {
  function printPdf() {
    document.body.classList.add("printing-estimate");
    window.addEventListener("afterprint", () => document.body.classList.remove("printing-estimate"), { once: true });
    window.print();
  }
  return <div className="flex gap-2 print:hidden"><Button type="button" variant="outline" onClick={printPdf}><FileDown />PDF</Button><Button nativeButton={false} render={<Link href={b2b ? `/api/b2b-leads/${leadId}/invoice/estimate/export` : `/api/leads/${leadId}/invoice/estimate/export`} />} variant="outline"><FileSpreadsheet />XLSX</Button></div>;
}
