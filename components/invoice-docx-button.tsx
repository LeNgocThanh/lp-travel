"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlignmentType, Document, Footer, Header, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

export interface InvoiceDocxData {
  invoiceNumber: string;
  billTo: string;
  contact: string;
  email: string;
  bookingCode: string;
  dueDate: string;
  issuerName: string;
  issuerContact: string;
  issuerEmail: string;
  invoiceDate: string;
  items: { description: string; quantity: number; unit: string; pricePerPaxUsd: string; amountUsd: string }[];
  amountUsd: string;
  depositAmountUsd: string;
  depositDueDate: string;
  balanceAmountUsd: string;
  balanceDueDate: string;
  paymentOptions: string[];
  headerImageUrl: string | null;
  headerContent: string | null;
  footerImageUrl: string | null;
  footerContent: string | null;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function imageParagraph(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải ảnh Header/Footer.");
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const scale = bitmap.width > 600 ? 600 / bitmap.width : 1;
  const type = blob.type.includes("png") ? "png" : blob.type.includes("gif") ? "gif" : blob.type.includes("bmp") ? "bmp" : "jpg";
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: new Uint8Array(await blob.arrayBuffer()), type: type as "png" | "gif" | "bmp" | "jpg", transformation: { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) } })] });
}

async function headerFooterChildren(imageUrl: string | null, content: string | null) {
  const children: Paragraph[] = [];
  if (imageUrl) children.push(await imageParagraph(imageUrl));
  if (content) content.split("\n").forEach((line) => children.push(new Paragraph({ children: [new TextRun(line)] })));
  return children.length ? children : [new Paragraph({ children: [] })];
}

function cell(text: string, bold = false, shading?: string) {
  return new TableCell({ shading: shading ? { type: ShadingType.SOLID, color: shading, fill: shading } : undefined, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });
}

async function buildInvoiceDocx(data: InvoiceDocxData) {
  const [header, footer] = await Promise.all([headerFooterChildren(data.headerImageUrl, data.headerContent), headerFooterChildren(data.footerImageUrl, data.footerContent)]);
  const infoTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell(`Bill to: ${data.billTo}\nContact: ${data.contact}\nBooking Code: ${data.bookingCode}\nDue Date: ${data.dueDate}\nEmail: ${data.email}`), cell(`Invoice Issuer: ${data.issuerName}\nContact: ${data.issuerContact}\nInvoice date: ${data.invoiceDate}\nEmail: ${data.issuerEmail}`)] })] });
  const itemTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell("Item", true, "FDE68A"), cell("Description", true, "FDE68A"), cell("Qty", true, "FDE68A"), cell("Unit", true, "FDE68A"), cell("Price/P", true, "FDE68A"), cell("Amount", true, "FDE68A")] }), ...data.items.map((item, index) => new TableRow({ children: [cell(String(index + 1)), cell(item.description), cell(String(item.quantity)), cell(item.unit), cell(item.pricePerPaxUsd), cell(item.amountUsd)] }))] });
  const totalTable = new Table({ alignment: AlignmentType.RIGHT, width: { size: 65, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell("TOTAL AMOUNT IN US Dollar", true), cell(data.amountUsd, true), cell("")] }), new TableRow({ children: [cell("Deposit", true, "FDE047"), cell(data.depositAmountUsd, true), cell(`Deposit before ${data.depositDueDate}`)] }), new TableRow({ children: [cell("Balance", true, "FDE047"), cell(data.balanceAmountUsd, true), cell(`Due Date ${data.balanceDueDate}`)] })] });
  const paymentParagraphs = data.paymentOptions.flatMap((content, index) => [
    ...content.split("\n").map((line) => new Paragraph({ children: [new TextRun(line)] })),
    ...(index < data.paymentOptions.length - 1 ? [new Paragraph({ children: [] }), new Paragraph({ children: [] })] : []),
  ]);
  return Packer.toBlob(new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1021, right: 1021, header: 567, footer: 567 } } }, headers: { default: new Header({ children: header }) }, footers: { default: new Footer({ children: footer }) }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "INVOICE", bold: true, size: 28 })] }), infoTable, new Paragraph({ spacing: { after: 180 }, children: [] }), itemTable, new Paragraph({ spacing: { after: 120 }, children: [] }), totalTable, ...(paymentParagraphs.length ? [new Paragraph({ spacing: { before: 360, after: 120 }, children: [new TextRun({ text: "PAYMENT OPTIONS", bold: true })] }), ...paymentParagraphs] : []), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 }, children: [new TextRun({ text: "Thank You For Travelling With Us!", bold: true, italics: true })] })] }] }));
}

export function InvoiceDocxButton({ invoice }: { invoice: InvoiceDocxData }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true); setError("");
    try {
      const safeName = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]+/g, "-") || "invoice";
      saveBlob(await buildInvoiceDocx(invoice), `${safeName}.docx`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xuất DOCX.");
    } finally {
      setBusy(false);
    }
  }
  return <div><Button type="button" variant="outline" disabled={busy} onClick={() => void download()}><FileText />{busy ? "Đang tạo DOCX..." : "DOCX"}</Button>{error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}</div>;
}
