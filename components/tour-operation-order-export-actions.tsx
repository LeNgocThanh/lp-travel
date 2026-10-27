"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { Button } from "@/components/ui/button";

export type TourOperationOrderExportData = { companyName: string; companyAddress: string; companyPhone: string | null; companyTaxCode: string; tourCode: string; guestCount: string; period: string; tourName: string; tourGuideNames: string | null; operatorName: string | null; operatorTitle: string | null; decisionText: string };
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "lenh-dieu-tour";
const saveBlob = (blob: Blob, fileName: string) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const cell = (value: string, bold = false, alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT) => new TableCell({ margins: { top: 110, bottom: 110, left: 130, right: 130 }, children: value.split("\n").map((line) => new Paragraph({ alignment, children: [new TextRun({ text: line, bold, font: "Times New Roman", size: 26 })] })) });

async function buildDocx(data: TourOperationOrderExportData) {
  const info = [["Mã code", data.tourCode], ["Số khách", data.guestCount], ["Thời gian", data.period], ["Tour tham quan", data.tourName], ["Hướng dẫn viên", data.tourGuideNames || ""], ["Điều hành tour", data.operatorName || ""]];
  const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } };
  const doc = new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1021, right: 1021 } } }, children: [
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: [new TableRow({ children: [cell(data.companyName, true, AlignmentType.CENTER), cell("CỘNG HÒA X\u00C3 HỘI CHỦ NGHĨA VIỆT NAM\nĐộc Lập - Tự do - Hạnh Phúc", true, AlignmentType.CENTER)] })] }),
    new Paragraph({ spacing: { before: 420, after: 300 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LỆNH ĐIỀU TOUR", bold: true, font: "Times New Roman", size: 36 })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: data.companyName, bold: true, font: "Times New Roman", size: 26 })] }),
    ...[["Địa chỉ", data.companyAddress], ["Điện thoại", data.companyPhone || ""], ["Mã số thuế", data.companyTaxCode], ["Điều hành", data.operatorName || ""], ["Chức vụ", data.operatorTitle || ""]].filter(([, value]) => value).map(([label, value]) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `- ${label}: `, bold: true, font: "Times New Roman", size: 26 }), new TextRun({ text: value, font: "Times New Roman", size: 26 })] })),
    new Paragraph({ spacing: { before: 180, after: 220 }, children: [new TextRun({ text: data.decisionText, font: "Times New Roman", size: 26 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: info.map(([label, value]) => new TableRow({ children: [cell(label, true), cell(value)] })) }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: [new TableRow({ children: [cell("", false, AlignmentType.CENTER), cell(`Đơn vị kinh doanh\n(Ký tên, đóng dấu (nếu có))\n${data.operatorTitle || "Điều hành"}\n\n\n${data.operatorName || ""}`, true, AlignmentType.CENTER)] })] }),
  ] }] });
  return Packer.toBlob(doc);
}

export function TourOperationOrderExportActions({ targetId, data }: { targetId: string; data: TourOperationOrderExportData }) {
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null); const [error, setError] = useState("");
  const docx = async () => { setBusy("docx"); setError(""); try { saveBlob(await buildDocx(data), `${safeName(`lenh-dieu-tour-${data.tourCode}`)}.docx`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xuất DOCX."); } finally { setBusy(null); } };
  const pdf = async () => { const node = document.getElementById(targetId); if (!node) return; setBusy("pdf"); setError(""); try { const [{ toPng }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]); const imageData = await toPng(node, { backgroundColor: "#ffffff", cacheBust: true, pixelRatio: 2 }); const document = await PDFDocument.create(); const image = await document.embedPng(imageData); const page = document.addPage([595.28, 841.89]); page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 }); saveBlob(new Blob([await document.save() as BlobPart], { type: "application/pdf" }), `${safeName(`lenh-dieu-tour-${data.tourCode}`)}.pdf`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xuất PDF."); } finally { setBusy(null); } };
  return <div className="space-y-1"><div className="flex gap-2"><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void docx()}><FileText />{busy === "docx" ? "Đang tạo..." : "DOCX"}</Button><Button type="button" disabled={Boolean(busy)} onClick={() => void pdf()}><Download />{busy === "pdf" ? "Đang tạo..." : "PDF"}</Button></div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
