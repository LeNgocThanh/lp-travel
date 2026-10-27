"use client";

import { useState } from "react";
import { Download, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

function saveDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  saveDataUrl(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ItineraryExportDay {
  dayNumber: number;
  date: string; // "yyyy-mm-dd"
  title: string;
  transport: string | null;
  flight: string | null;
  tourGuide: boolean;
  overnight: boolean;
  overnightLocation: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  accommodation: string | null;
  activityLocation: string | null;
  startLocation: string | null;
  endLocation: string | null;
  description: string | null;
  notes: string | null;
}

export interface ItineraryExportDoc {
  title: string;
  headerImageUrl: string | null;
  headerContent: string | null;
  footerImageUrl: string | null;
  footerContent: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  informationNotes?: string | null;
  days: ItineraryExportDay[];
  confirmation?: {
    groupCode: string;
    numberOfGuests: string | null;
    numberOfRooms: string | null;
    nationality: string | null;
    guide: string | null;
    essentialTravelInfo: string | null;
    notes: string | null;
    days: { dayNumber: number; date: string; itinerary: string | null; meals: string | null; transferGuide: string | null; hotelInformation: string | null }[];
  };
}

function displayDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("weekday")},${value("day")} ${value("month")} ${value("year")}`;
}

function mealsLabel(day: Pick<ItineraryExportDay, "breakfast" | "lunch" | "dinner">) {
  return `(${day.breakfast ? "B" : "-"}/${day.lunch ? "L" : "-"}/${day.dinner ? "D" : "-"})`;
}

function mealsText(day: Pick<ItineraryExportDay, "breakfast" | "lunch" | "dinner">) {
  return [[day.breakfast, "Breakfast"], [day.lunch, "Lunch"], [day.dinner, "Dinner"]].filter(([selected]) => selected).map(([, label]) => label).join(", ");
}

async function embedImage(url: string, maxWidthPx: number) {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const scale = bitmap.width > maxWidthPx ? maxWidthPx / bitmap.width : 1;
  const type = blob.type.includes("png") ? "png" : blob.type.includes("gif") ? "gif" : blob.type.includes("bmp") ? "bmp" : "jpg";
  return {
    data: new Uint8Array(await blob.arrayBuffer()),
    type: type as "png" | "gif" | "bmp" | "jpg",
    width: Math.round(bitmap.width * scale),
    height: Math.round(bitmap.height * scale),
  };
}

async function buildHeaderOrFooter(imageUrl: string | null, content: string | null, maxWidthPx: number) {
  const children: Paragraph[] = [];
  if (imageUrl) {
    const image = await embedImage(imageUrl, maxWidthPx);
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: image.data, type: image.type, transformation: { width: image.width, height: image.height } })],
    }));
  }
  if (content) {
    content.split("\n").forEach((line) => {
      children.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: line, italics: true, size: 18, color: "555555" })],
      }));
    });
  }
  return children.length ? children : [new Paragraph({ children: [] })];
}

function textCell(text: string, run: { bold?: boolean; italics?: boolean; color?: string } = {}) {
  return new TableCell({
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: text.split("\n").map((line) => new Paragraph({ children: [new TextRun({ text: line, ...run })] })),
  });
}

function summaryTable(days: ItineraryExportDay[], withHeader = false) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [...(withHeader ? [new TableRow({ children: [textCell("Day", { bold: true }), textCell("Itinerary and Brief", { bold: true }), textCell("Transfer & Guide", { bold: true }), textCell("Meals", { bold: true })] })] : []), ...days.map((day) => new TableRow({
      children: [
        textCell(`Day ${day.dayNumber} (${displayDate(day.date)})`, { bold: true, color: "92400E" }),
        textCell(day.title),
        textCell([day.transport ?? "—", day.tourGuide ? "Tour guide: Yes" : ""].filter(Boolean).join("\n")),
        textCell(mealsLabel(day)),
      ],
    }))],
  });
}

function dayDetail(day: ItineraryExportDay, isLast: boolean) {
  const paragraphs: Paragraph[] = [];
  paragraphs.push(new Paragraph({
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text: `Day ${day.dayNumber} (${displayDate(day.date)}) ${day.title} ${mealsLabel(day)}`, bold: true, color: "92400E" })],
  }));
  const field = (label: string, value: string | null) => {
    if (!value) return;
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `${label}: `, bold: true, italics: true }), new TextRun({ text: value, italics: true })],
    }));
  };
  field("Accommodation", day.accommodation);
  field("Meals", mealsText(day) || null);
  field("Activity location", day.activityLocation);
  if (day.startLocation) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: "Start: ", bold: true }), new TextRun({ text: day.startLocation }),
        ...(day.endLocation ? [new TextRun({ text: "   ·   End: ", bold: true }), new TextRun({ text: day.endLocation })] : []),
      ],
    }));
  }
  field("Transport", day.transport);
  if (day.tourGuide) paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Tour guide: Yes", bold: true })] }));
  if (day.flight && !isLast) paragraphs.push(new Paragraph({ children: [new TextRun({ text: `Flight: ${day.flight}`, bold: true, color: "000000" })] }));
  if (day.description) day.description.split("\n").forEach((line) => paragraphs.push(new Paragraph({ children: [new TextRun({ text: line })] })));
  if (day.flight && isLast) paragraphs.push(new Paragraph({ children: [new TextRun({ text: `Flight: ${day.flight}`, bold: true, color: "000000" })] }));
  if (day.overnight && day.overnightLocation) paragraphs.push(new Paragraph({ children: [new TextRun({ text: `Overnight in ${day.overnightLocation}`, bold: true, color: "000000" })] }));
  if (day.notes) day.notes.split("\n").forEach((line, index) => paragraphs.push(new Paragraph({ children: [new TextRun({ text: `${index === 0 ? "Note: " : ""}${line}`, italics: true, color: "DC2626" })] })));
  return paragraphs;
}

const informationLines = (value: string | null | undefined) => value?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];

function informationSection(data: ItineraryExportDoc, title = "II. Quotation & Information") {
  if (!data.inclusions && !data.exclusions && !data.informationNotes) return [];
  const bulletCell = (value: string | null | undefined) => { const items = informationLines(value); return new TableCell({ margins: { top: 100, bottom: 100, left: 180, right: 100 }, children: items.length ? items.map((line) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(line)] })) : [new Paragraph({ children: [] })] }); };
  const children: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: 720, after: 180 }, children: [new TextRun({ text: title, bold: true })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [textCell("Inclusions", { bold: true, color: "F59E0B" }), textCell("Exclusions", { bold: true, color: "F59E0B" })] }), new TableRow({ children: [bulletCell(data.inclusions), bulletCell(data.exclusions)] })] }),
  ];
  if (data.informationNotes) children.push(new Paragraph({ spacing: { before: 600, after: 100 }, children: [new TextRun({ text: "NOTES:", bold: true, color: "F59E0B" })] }), ...informationLines(data.informationNotes).map((line) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(line)] })));
  return children;
}

function confirmationSection(data: ItineraryExportDoc) {
  const confirmation = data.confirmation!;
  const labelRow = (label: string, value: string | null) => new TableRow({ children: [textCell(label, { bold: true }), textCell(value || "—")] });
  const informationRows = [
    new TableRow({ children: [textCell("Date", { bold: true }), textCell("Itinerary", { bold: true }), textCell("Meals", { bold: true }), textCell("Transfer + Guide", { bold: true }), textCell("Hotel Information + Code Hotel Booking", { bold: true })] }),
    ...confirmation.days.map((day) => new TableRow({ children: [textCell(`Day ${day.dayNumber} (${displayDate(day.date)})`), textCell(day.itinerary || "—"), textCell(day.meals || "—"), textCell(day.transferGuide || "—"), textCell(day.hotelInformation || "—")] })),
  ];
  return [
    new Paragraph({ spacing: { after: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MÃ ĐOÀN ${confirmation.groupCode}`, bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun("1-Confirmation")] }), new Paragraph({ children: [new TextRun("2-Brief Itinerary")] }), new Paragraph({ children: [new TextRun("3-Details Itinerary")] }), new Paragraph({ children: [new TextRun("4-Inclusion & Exclusion")] }),
    new Paragraph({ thematicBreak: true, spacing: { after: 240 } }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "1-Confirmation:", bold: true, underline: {} })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [labelRow("Number of Guests", confirmation.numberOfGuests), labelRow("Number of Rooms", confirmation.numberOfRooms), labelRow("Nationality", confirmation.nationality), labelRow("Guide", confirmation.guide), new TableRow({ children: [new TableCell({ columnSpan: 2, children: [new Paragraph({ children: [new TextRun({ text: "Essential Travel Info to Vietnam before tour", bold: true, underline: {}, color: "1D4ED8" })] })] })] })] }),
    new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text: "Information Details:", bold: true })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: informationRows }),
    ...(confirmation.notes ? [new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Note: ", bold: true }), new TextRun({ text: confirmation.notes })] })] : []),
    new Paragraph({ spacing: { before: 360, after: 120 }, children: [new TextRun({ text: "2-Brief Itinerary:", bold: true, underline: {} })] }),
    summaryTable(data.days, true),
    new Paragraph({ spacing: { before: 180 }, children: [new TextRun({ text: "Note:", italics: true, color: "DC2626" })] }),
    new Paragraph({ children: [new TextRun({ text: "- Standard hotel check-in time is 14:00, Standard hotel check-out time is 12:00", italics: true, color: "DC2626" })] }),
    new Paragraph({ children: [new TextRun({ text: "- Bring your valid passport", italics: true, color: "DC2626" })] }),
    new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text: "3-Details Itinerary:", bold: true, underline: {} })] }),
    ...data.days.flatMap((day, index) => dayDetail(day, index === data.days.length - 1)),
    new Paragraph({ spacing: { before: 720 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "End of services!", bold: true, color: "000000" })] }),
    ...informationSection(data, "4-Inclusion & Exclusion"),
  ];
}

export async function buildItineraryDocx(data: ItineraryExportDoc): Promise<Blob> {
  const usableWidthPx = 600; // fits within the A4 body width below at 96dpi
  const [headerChildren, footerChildren] = await Promise.all([
    buildHeaderOrFooter(data.headerImageUrl, data.headerContent, usableWidthPx),
    buildHeaderOrFooter(data.footerImageUrl, data.footerContent, usableWidthPx),
  ]);
  const bodyChildren = data.confirmation ? confirmationSection(data) : [
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: "FDE047", fill: "FDE047" },
      children: [new TextRun({ text: data.title, bold: true })],
    }),
    summaryTable(data.days),
    new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text: "I. Details Itinerary:", bold: true })] }),
    ...data.days.flatMap((day, index) => dayDetail(day, index === data.days.length - 1)),
    new Paragraph({ spacing: { before: 720 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "End of services!", bold: true, color: "000000" })] }),
    ...informationSection(data),
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 in twips
          margin: { top: 1134, bottom: 1134, left: 1021, right: 1021, header: 567, footer: 567 },
        },
      },
      headers: { default: new Header({ children: headerChildren }) },
      footers: { default: new Footer({ children: footerChildren }) },
      children: bodyChildren,
    }],
  });

  return Packer.toBlob(doc);
}

export function ItineraryExportActions({ targetId, fileName, itinerary }: { targetId: string; fileName: string; itinerary?: ItineraryExportDoc }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "itinerary";

  async function run(format: "docx" | "png" | "jpg" | "pdf") {
    const node = document.getElementById(targetId);
    if (format !== "docx" && !node) return;
    setBusy(format); setError("");
    try {
      if (format === "docx") {
        if (!itinerary) throw new Error("Thiếu dữ liệu lịch trình để xuất Word.");
        const blob = await buildItineraryDocx(itinerary);
        saveBlob(blob, `${safeName}.docx`);
      } else if (format === "png") {
        const { toPng } = await import("html-to-image");
        saveDataUrl(await toPng(node!, { backgroundColor: "#ffffff", cacheBust: true, pixelRatio: 2 }), `${safeName}.png`);
      } else if (format === "jpg") {
        const { toJpeg } = await import("html-to-image");
        saveDataUrl(await toJpeg(node!, { backgroundColor: "#ffffff", cacheBust: true, pixelRatio: 2, quality: 0.95 }), `${safeName}.jpg`);
      } else {
        const [{ toCanvas }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]);
        const canvas = await toCanvas(node!, { backgroundColor: "#ffffff", cacheBust: true, pixelRatio: 2 });
        const pdf = await PDFDocument.create();
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 24;
        const imageWidth = pageWidth - margin * 2;
        const printableHeight = pageHeight - margin * 2;
        const pixelsPerPage = Math.floor(canvas.width * printableHeight / imageWidth);
        for (let top = 0; top < canvas.height; top += pixelsPerPage) {
          const sliceHeight = Math.min(pixelsPerPage, canvas.height - top);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = sliceHeight;
          slice.getContext("2d")?.drawImage(canvas, 0, top, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          const image = await pdf.embedPng(slice.toDataURL("image/png"));
          const drawnHeight = sliceHeight * imageWidth / canvas.width;
          const page = pdf.addPage([pageWidth, pageHeight]);
          page.drawImage(image, { x: margin, y: pageHeight - margin - drawnHeight, width: imageWidth, height: drawnHeight });
        }
        const bytes = await pdf.save();
        saveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${safeName}.pdf`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xuất file.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="space-y-2"><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void run("docx")}><FileText />DOCX</Button><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void run("png")}><FileImage />PNG</Button><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void run("jpg")}><FileImage />JPG</Button><Button type="button" disabled={Boolean(busy)} onClick={() => void run("pdf")}><Download />PDF</Button></div>{busy && <p className="text-right text-xs text-muted-foreground">Đang tạo file {busy.toUpperCase()}...</p>}{error && <p role="alert" className="text-right text-xs text-destructive">{error}</p>}</div>;
}
