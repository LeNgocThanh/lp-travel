"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { AlignmentType, Document, Footer, Header, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { Button } from "@/components/ui/button";

type ExportDay = { dayLabel: string; date: string; title: string; meals: string; content: string | null; accommodation: string | null; notes: string | null };
export type QuickTourProgramExportData = {
  title: string; durationText: string | null; transportText: string | null; departureText: string | null; programName: string; tourCode: string | null; guestSummary: string | null;
  startDate: string; endDate: string; groupLeader: string; vehiclePlate: string | null; driver: string; tourGuide: string; closingText: string | null;
  headerImageUrl: string | null; headerContent: string | null; footerImageUrl: string | null; footerContent: string | null;
  days: ExportDay[]; inclusions: string[]; exclusions: string[];
};

const safeName = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "chuong-trinh-tour";
const saveBlob = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const textCell = (value: string, bold = false) => new TableCell({ margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: value.split("\n").map((line) => new Paragraph({ children: [new TextRun({ text: line, bold, font: "Arial", size: 20 })] })) });
const paragraph = (value: string, bold = false) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: value, bold, font: "Arial", size: 20 })] });

async function imageArea(imageUrl: string | null, content: string | null) {
  const rows: Paragraph[] = [];
  if (imageUrl) {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, 600 / bitmap.width, 120 / bitmap.height);
      rows.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: new Uint8Array(await blob.arrayBuffer()), type: blob.type.includes("png") ? "png" : "jpg", transformation: { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) } })] }));
    }
  }
  content?.split(/\r?\n/).forEach((line) => rows.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: line, font: "Arial", size: 18 })] })));
  return rows.length ? rows : [new Paragraph({ children: [] })];
}

async function buildDocx(data: QuickTourProgramExportData) {
  const [header, footer] = await Promise.all([imageArea(data.headerImageUrl, data.headerContent), imageArea(data.footerImageUrl, data.footerContent)]);
  const overview = [
    ["Tên chương trình", data.programName], ["Mã Tour", data.tourCode || "—"], ["Số lượng khách", data.guestSummary || "—"],
    ["Ngày khởi hành", data.startDate], ["Ngày kết thúc", data.endDate], ["Trưởng đoàn", data.groupLeader], ["Biển số xe", data.vehiclePlate || "—"], ["Lái xe", data.driver], ["Hướng dẫn viên", data.tourGuide],
  ];
  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: data.title.toUpperCase(), bold: true, font: "Arial", size: 32 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `Thời gian: ${data.durationText || "—"}  |  Phương tiện: ${data.transportText || "—"}  |  Khởi hành: ${data.departureText || "—"}`, font: "Arial", size: 20 })] }),
    paragraph("THÔNG TIN CHUNG (TOUR OVERVIEW)", true),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: overview.map(([label, value]) => new TableRow({ children: [textCell(label, true), textCell(value)] })) }),
    new Paragraph({ spacing: { before: 300, after: 120 }, children: [new TextRun({ text: "CHƯƠNG TRÌNH TOUR", bold: true, font: "Arial", size: 22 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: [textCell("Ngày", true), textCell("Lịch trình", true), textCell("Bữa ăn", true)] }), ...data.days.map((day) => new TableRow({ children: [textCell(`${day.dayLabel}${day.date ? ` (${day.date})` : ""}`), textCell(day.title, true), textCell(day.meals)] }))] }),
    ...data.days.flatMap((day) => [new Paragraph({ spacing: { before: 280, after: 100 }, children: [new TextRun({ text: `${day.dayLabel}${day.date ? ` (${day.date})` : ""}: ${day.title} (${day.meals})`, bold: true, font: "Arial", size: 21 })] }), ...(day.content ? day.content.split(/\r?\n/).map((line) => paragraph(line)) : []), ...(day.accommodation ? [paragraph(`Nghỉ đêm: ${day.accommodation}`, true)] : []), ...(day.notes ? [new Paragraph({ children: [new TextRun({ text: `Lưu ý: ${day.notes}`, italics: true, color: "DC2626", font: "Arial", size: 20 })] })] : [])]),
    new Paragraph({ spacing: { before: 360, after: 100 }, children: [new TextRun({ text: "BAO GỒM TRONG TOUR", bold: true, font: "Arial", size: 22 })] }),
    ...data.inclusions.map((value) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: value, font: "Arial", size: 20 })] })),
    new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text: "KHÔNG BAO GỒM", bold: true, font: "Arial", size: 22 })] }),
    ...data.exclusions.map((value) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: value, font: "Arial", size: 20 })] })),
    ...(data.closingText ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: data.closingText, bold: true, italics: true, font: "Arial", size: 20 })] })] : []),
  ];
  return Packer.toBlob(new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1021, right: 1021, header: 567, footer: 567 } } }, headers: { default: new Header({ children: header }) }, footers: { default: new Footer({ children: footer }) }, children }] }));
}

export function QuickTourProgramExportActions({ targetId, data }: { targetId: string; data: QuickTourProgramExportData }) {
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState("");
  const downloadDocx = async () => { setBusy("docx"); setError(""); try { saveBlob(await buildDocx(data), `${safeName(data.title)}.docx`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xuất DOCX."); } finally { setBusy(null); } };
  const downloadPdf = async () => {
    const node = document.getElementById(targetId); if (!node) return;
    setBusy("pdf"); setError("");
    try {
      const [{ toCanvas }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]);
      const canvas = await toCanvas(node, { backgroundColor: "#ffffff", cacheBust: true, pixelRatio: 2 });
      const pdf = await PDFDocument.create(); const pageWidth = 595.28; const pageHeight = 841.89; const imageWidth = pageWidth; const pixelsPerPage = Math.floor(canvas.width * pageHeight / imageWidth);
      for (let top = 0; top < canvas.height; top += pixelsPerPage) { const height = Math.min(pixelsPerPage, canvas.height - top); const slice = document.createElement("canvas"); slice.width = canvas.width; slice.height = height; slice.getContext("2d")?.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height); const image = await pdf.embedPng(slice.toDataURL("image/png")); const page = pdf.addPage([pageWidth, pageHeight]); page.drawImage(image, { x: 0, y: pageHeight - height * imageWidth / canvas.width, width: imageWidth, height: height * imageWidth / canvas.width }); }
      saveBlob(new Blob([await pdf.save() as BlobPart], { type: "application/pdf" }), `${safeName(data.title)}.pdf`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xuất PDF."); } finally { setBusy(null); }
  };
  return <div className="space-y-1"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void downloadDocx()}><FileText />{busy === "docx" ? "Đang tạo..." : "DOCX"}</Button><Button type="button" disabled={Boolean(busy)} onClick={() => void downloadPdf()}><Download />{busy === "pdf" ? "Đang tạo..." : "PDF"}</Button></div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
