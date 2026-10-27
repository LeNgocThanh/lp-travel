"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Distribution = { label: string; count: number; percent: string };
type ReportLead = { date: string; leadId: string; customerName: string; status: string | null; channel: string | null; country: string | null; pax: number | null };
type ReportData = { total: number; oldBookings: number; quotationSent: number; invalid: number; confirmed: number; statuses: Distribution[]; channels: Distribution[]; qualities: { label: string; count: number }[]; leads: ReportLead[]; autoRemarks: string[] };
type InstagramRow = { id: number; item: string; firstDay: string; secondDay: string; total: string; note: string };

const viDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("vi-VN", { timeZone: "UTC" });
const shortDate = (value: string) => viDate(value).slice(0, 5);
const text = (value: string | null | number) => value === null || value === "" ? "-" : String(value);
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "lead-report";
const statusFill = (value: string) => value.trim().toLocaleLowerCase("en") === "invalid number" ? "F4CCCC" : value.trim().toLocaleLowerCase("en") === "quotation sent" ? "FFE599" : undefined;

function saveBlob(blob: Blob, fileName: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function wordCell(value: string, bold = false, fill?: string) { return new TableCell({ shading: fill ? { type: ShadingType.SOLID, color: fill, fill } : undefined, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: value.split("\n").map((line) => new Paragraph({ children: [new TextRun({ text: line, bold, size: 19 })] })) }); }
function wordTable(headers: string[], rows: string[][]) { return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: headers.map((value) => wordCell(value, true, "D9EAF7")) }), ...rows.map((row) => new TableRow({ children: row.map((value) => wordCell(value, false, statusFill(value))) }))] }); }
function heading(value: string) { return new Paragraph({ spacing: { before: 260, after: 100 }, children: [new TextRun({ text: value, bold: true, size: 23, color: "1F4E78" })] }); }

export function LeadReportBuilder({ from, to, leadSource, leadSources, data }: { from: string; to: string; leadSource: string; leadSources: string[]; data: ReportData }) {
  const toDate = new Date(`${to}T00:00:00Z`);
  const reportTitle = leadSource ? `BÁO CÁO LEAD B2C Lead Source = '${leadSource}'` : "BÁO CÁO LEAD B2C";
  const [periodLabel, setPeriodLabel] = useState(`Tuần ${Math.ceil(toDate.getUTCDate() / 7)} tháng ${toDate.getUTCMonth() + 1}`);
  const [headline, setHeadline] = useState(`Tuần này chốt ${String(data.oldBookings).padStart(2, "0")} bookings B2C (từ lead cũ) | Lead mới từ ${shortDate(from)}: ${data.total} leads`);
  const [instagramTitle, setInstagramTitle] = useState(`Hiệu suất Instagram Vietnam Moments (${shortDate(from)}–${shortDate(to)})`);
  const [rows, setRows] = useState<InstagramRow[]>([{ id: 1, item: "", firstDay: "", secondDay: "", total: "", note: "" }]);
  const [manualRemarks, setManualRemarks] = useState(["", "", "", ""]);
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null); const [error, setError] = useState("");
  const firstLabel = shortDate(from); const secondLabel = shortDate(to);
  const statusCount = (aliases: string[]) => data.statuses.filter((item) => aliases.includes(item.label.trim().toLocaleLowerCase("vi"))).reduce((sum, item) => sum + item.count, 0);
  const overview = useMemo(() => [["Tổng Lead mới", String(data.total)], ["Contacted", String(statusCount(["contacted", "đã liên hệ"]))], ["Quotation Sent", String(data.quotationSent)], ["Invalid Number", String(data.invalid)], ["Chưa cập nhật Status", String(statusCount(["chưa có", "chưa có status"]))], ["Confirmed (trong nhóm lead mới này)", String(data.confirmed)], ["Booking chốt trong kỳ (từ lead cũ)", String(data.oldBookings)]], [data]);
  const filledRows = rows.filter((row) => Object.values(row).some((value) => typeof value === "string" && value.trim()));

  function updateRow(id: number, key: keyof Omit<InstagramRow, "id">, value: string) { setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row)); }
  function updateRemark(index: number, value: string) { setManualRemarks((current) => current.map((item, itemIndex) => itemIndex === index ? value : item)); }

  async function exportDocx() {
    setBusy("docx"); setError("");
    try {
      const children: (Paragraph | Table)[] = [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LA PASSION TRAVEL", bold: true, size: 30, color: "1F4E78" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: reportTitle, bold: true, size: 27 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Từ ngày ${viDate(from)} đến ${viDate(to)}`, size: 21 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [new TextRun({ text: periodLabel, bold: true, size: 21 })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [wordCell(`★ ${headline}`, true, "FFF2CC")] })] }),
        heading(`1. Tổng quan Lead mới (${viDate(from)}–${viDate(to)})`), wordTable(["Chỉ số", "Giá trị"], overview),
        heading(`2. ${instagramTitle}`), wordTable(["Hạng mục", firstLabel, secondLabel, "Tổng", "Ghi chú"], filledRows.map((row) => [row.item, row.firstDay, row.secondDay, row.total, row.note])),
        heading(`3. Phân bổ trạng thái ${data.total} Lead mới`), wordTable(["Lead Status", "Số lượng", "%"], data.statuses.map((item) => [item.label, String(item.count), item.percent])),
        heading("4. Phân bổ theo Channel"), wordTable(["Channel", "Số Lead", "%"], data.channels.map((item) => [item.label, String(item.count), item.percent])),
        heading("5. Phân bổ Lead Quality"), new Paragraph({ children: [new TextRun(data.qualities.map((item) => `${item.label}: ${item.count}`).join("   |   ") || "Chưa có dữ liệu")] }),
        heading(`6. Chi tiết ${data.total} Lead`), wordTable(["Ngày", "Lead ID", "Tên", "Status", "Channel", "Country", "Pax"], data.leads.map((lead) => [shortDate(lead.date), lead.leadId, lead.customerName || "-", text(lead.status), text(lead.channel), text(lead.country), text(lead.pax)])),
        heading("7. Nhận xét & Đề xuất"), ...[...data.autoRemarks, ...manualRemarks].map((item, index) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `${index + 1}. ${item || ""}`, size: 20 })] })),
      ];
      const blob = await Packer.toBlob(new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 850, right: 850 } } }, children }] })); saveBlob(blob, `${safeName(`bao-cao-lead-${from}-${to}`)}.docx`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xuất DOCX."); } finally { setBusy(null); }
  }

  async function exportPdf() {
    const node = document.getElementById("lead-report-preview"); if (!node) return; setBusy("pdf"); setError("");
    try {
      const [{ toCanvas }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]); const canvas = await toCanvas(node, { backgroundColor: "#ffffff", cacheBust: true, pixelRatio: 2 }); const pdf = await PDFDocument.create(); const pageWidth = 595.28; const pageHeight = 841.89; const margin = 22; const imageWidth = pageWidth - margin * 2; const printableHeight = pageHeight - margin * 2; const pixelsPerPage = Math.floor(canvas.width * printableHeight / imageWidth);
      for (let top = 0; top < canvas.height; top += pixelsPerPage) { const sliceHeight = Math.min(pixelsPerPage, canvas.height - top); const slice = document.createElement("canvas"); slice.width = canvas.width; slice.height = sliceHeight; slice.getContext("2d")?.drawImage(canvas, 0, top, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight); const image = await pdf.embedPng(slice.toDataURL("image/png")); const drawnHeight = sliceHeight * imageWidth / canvas.width; const page = pdf.addPage([pageWidth, pageHeight]); page.drawImage(image, { x: margin, y: pageHeight - margin - drawnHeight, width: imageWidth, height: drawnHeight }); }
      saveBlob(new Blob([await pdf.save() as BlobPart], { type: "application/pdf" }), `${safeName(`bao-cao-lead-${from}-${to}`)}.pdf`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xuất PDF."); } finally { setBusy(null); }
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Báo cáo Lead B2C</h1><p className="text-sm text-muted-foreground">Tạo báo cáo theo Date Received và bổ sung nội dung nhập tay.</p></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void exportDocx()}><FileText />DOCX</Button><Button type="button" disabled={Boolean(busy)} onClick={() => void exportPdf()}><Download />PDF</Button></div></div>
    <Card className="p-5"><form className="flex flex-wrap items-end gap-3"><label className="space-y-1"><Label>Date Received từ</Label><Input name="from" type="date" defaultValue={from} max={to} required /></label><label className="space-y-1"><Label>Date Received đến</Label><Input name="to" type="date" defaultValue={to} min={from} required /></label><label className="space-y-1"><Label>Lead Source</Label><select name="leadSource" defaultValue={leadSource} className="h-8 min-w-48 rounded-lg border bg-transparent px-2.5 text-sm"><option value="">Tất cả Lead Source</option>{leadSources.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><Button type="submit">Tạo báo cáo</Button></form></Card>
    <Card className="space-y-5 p-5"><div className="space-y-2"><Label>Tên kỳ báo cáo</Label><Input value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} /></div><div className="space-y-2"><Label>Dòng tóm tắt đầu báo cáo</Label><Textarea value={headline} onChange={(event) => setHeadline(event.target.value)} /></div><div className="space-y-2"><Label>Tiêu đề phần Instagram</Label><Input value={instagramTitle} onChange={(event) => setInstagramTitle(event.target.value)} /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Bảng hiệu suất Instagram</Label><Button type="button" variant="outline" size="sm" onClick={() => setRows((current) => [...current, { id: Math.max(0, ...current.map((row) => row.id)) + 1, item: "", firstDay: "", secondDay: "", total: "", note: "" }])}><Plus />Thêm dòng</Button></div>{rows.map((row) => <div key={row.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.3fr_repeat(3,.6fr)_1.3fr_auto]"><Input value={row.item} onChange={(event) => updateRow(row.id, "item", event.target.value)} placeholder="Hạng mục" /><Input value={row.firstDay} onChange={(event) => updateRow(row.id, "firstDay", event.target.value)} placeholder={firstLabel} /><Input value={row.secondDay} onChange={(event) => updateRow(row.id, "secondDay", event.target.value)} placeholder={secondLabel} /><Input value={row.total} onChange={(event) => updateRow(row.id, "total", event.target.value)} placeholder="Tổng" /><Input value={row.note} onChange={(event) => updateRow(row.id, "note", event.target.value)} placeholder="Ghi chú" /><Button type="button" variant="ghost" size="icon" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label="Xóa dòng"><Trash2 /></Button></div>)}</div><div className="grid gap-3 md:grid-cols-2">{manualRemarks.map((remark, index) => <div key={index} className="space-y-2"><Label>Nhận xét & đề xuất {index + 3}</Label><Textarea value={remark} onChange={(event) => updateRemark(index, event.target.value)} placeholder={`Nhập nội dung mục ${index + 3}`} /></div>)}</div></Card>
    {busy && <p className="text-sm text-muted-foreground">Đang tạo file {busy.toUpperCase()}...</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <ReportPreview title={reportTitle} from={from} to={to} periodLabel={periodLabel} headline={headline} instagramTitle={instagramTitle} rows={filledRows} firstLabel={firstLabel} secondLabel={secondLabel} data={data} overview={overview} manualRemarks={manualRemarks} />
  </div>;
}

function ReportPreview({ title, from, to, periodLabel, headline, instagramTitle, rows, firstLabel, secondLabel, data, overview, manualRemarks }: { title: string; from: string; to: string; periodLabel: string; headline: string; instagramTitle: string; rows: InstagramRow[]; firstLabel: string; secondLabel: string; data: ReportData; overview: string[][]; manualRemarks: string[] }) {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="space-y-2"><h2 className="text-lg font-bold text-[#1f4e78]">{title}</h2>{children}</section>;
  const PreviewTable = ({ headers, body }: { headers: string[]; body: (string | number)[][] }) => <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{headers.map((header) => <th key={header} className="border bg-[#d9eaf7] p-2 text-left font-bold">{header}</th>)}</tr></thead><tbody>{body.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => { const fill = statusFill(String(cell)); return <td key={cellIndex} className="border p-2" style={fill ? { backgroundColor: `#${fill}` } : undefined}>{cell}</td>; })}</tr>)}</tbody></table></div>;
  return <Card id="lead-report-preview" className="mx-auto max-w-5xl space-y-6 bg-white p-6 text-black sm:p-10"><header className="text-center"><p className="text-2xl font-bold text-[#1f4e78]">LA PASSION TRAVEL</p><h1 className="mt-1 text-xl font-bold">{title}</h1><p>Từ ngày {viDate(from)} đến {viDate(to)}</p><p className="font-semibold">{periodLabel}</p></header><div className="border bg-[#fff2cc] p-3 font-bold">★ {headline}</div><Section title={`1. Tổng quan Lead mới (${viDate(from)}–${viDate(to)})`}><PreviewTable headers={["Chỉ số", "Giá trị"]} body={overview} /></Section><Section title={`2. ${instagramTitle}`}><PreviewTable headers={["Hạng mục", firstLabel, secondLabel, "Tổng", "Ghi chú"]} body={rows.map((row) => [row.item, row.firstDay, row.secondDay, row.total, row.note])} /></Section><Section title={`3. Phân bổ trạng thái ${data.total} Lead mới`}><PreviewTable headers={["Lead Status", "Số lượng", "%"]} body={data.statuses.map((item) => [item.label, item.count, item.percent])} /></Section><Section title="4. Phân bổ theo Channel"><PreviewTable headers={["Channel", "Số Lead", "%"]} body={data.channels.map((item) => [item.label, item.count, item.percent])} /></Section><Section title="5. Phân bổ Lead Quality"><p>{data.qualities.map((item) => `${item.label}: ${item.count}`).join("   |   ") || "Chưa có dữ liệu"}</p></Section><Section title={`6. Chi tiết ${data.total} Lead`}><PreviewTable headers={["Ngày", "Lead ID", "Tên", "Status", "Channel", "Country", "Pax"]} body={data.leads.map((lead) => [shortDate(lead.date), lead.leadId, lead.customerName || "-", text(lead.status), text(lead.channel), text(lead.country), text(lead.pax)])} /></Section><Section title="7. Nhận xét & Đề xuất"><ol className="list-decimal space-y-2 pl-5">{[...data.autoRemarks, ...manualRemarks].map((remark, index) => <li key={index}>{remark}</li>)}</ol></Section></Card>;
}
