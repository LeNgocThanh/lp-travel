"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InvoicePrintButton() { return <Button type="button" onClick={() => { document.body.classList.add("printing-invoice"); window.addEventListener("afterprint", () => document.body.classList.remove("printing-invoice"), { once: true }); window.print(); }}><Printer />In / Lưu PDF</Button>; }
