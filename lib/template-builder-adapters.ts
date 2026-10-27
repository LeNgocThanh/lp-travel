import "server-only";
import { prisma } from "@/lib/prisma";
import type { TemplateDocumentData, TemplateDocumentValue } from "@/lib/template-builder-document-data";

const date = (value: Date | null | undefined) => value?.toLocaleDateString("en-GB", { timeZone: "UTC" }) ?? "";
const isoDate = (value: Date | null | undefined) => value?.toISOString().slice(0, 10) ?? "";
const itineraryDate = (value: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "2-digit" }).format(value);
const money = (value: { toString(): string }) => Number(value.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const vnd = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ₫`;
const lines = (value: string | null | undefined) => value?.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean) ?? [];

function itineraryDays(days: { dayNumber: number; date: Date; title: string; transport: string | null; flight: string | null; accommodation: string | null; breakfast: boolean; lunch: boolean; dinner: boolean; overnight: boolean; overnightLocation: string | null; description: string | null; notes: string | null }[]) {
  return days.map((day, index) => ({ dayNumber: day.dayNumber, date: itineraryDate(day.date), title: day.title, transport: day.transport ?? "", meals: [[day.breakfast, "B"], [day.lunch, "L"], [day.dinner, "D"]].map(([selected, label]) => selected ? label : "-").join("/"), content: day.description ?? "", accommodation: day.accommodation ?? "", overnight: day.overnight && day.overnightLocation ? `Overnight in ${day.overnightLocation}` : "", flight: day.flight ?? "", notes: day.notes ?? "", isLastDay: index === days.length - 1 }));
}

export async function buildItineraryDocumentData(itineraryId: string): Promise<TemplateDocumentData> {
  const quick = await prisma.quickItinerary.findUnique({ where: { id: itineraryId }, include: { lead: true, b2bLead: true, days: { orderBy: { dayNumber: "asc" } } } });
  if (quick) { const lead = quick.lead ?? quick.b2bLead; return { itinerary: { title: quick.title, inclusions: lines(quick.inclusions), exclusions: lines(quick.exclusions), notes: lines(quick.informationNotes), days: itineraryDays(quick.days) }, customer: { name: lead?.customerName ?? "" }, lead: { destination: lead?.destination ?? "", travelDate: isoDate(lead?.travelDate), duration: lead?.duration ?? "" } } as TemplateDocumentData; }
  const work = await prisma.workCaseItinerary.findUnique({ where: { id: itineraryId }, include: { workCase: true, days: { orderBy: { dayNumber: "asc" } } } });
  if (!work) throw new Error("Không tìm thấy lịch trình.");
  return { itinerary: { title: work.title, inclusions: lines(work.inclusions), exclusions: lines(work.exclusions), notes: lines(work.informationNotes), days: itineraryDays(work.days) }, customer: { name: work.workCase.customerNameSnapshot }, lead: { destination: "", travelDate: isoDate(work.days[0]?.date), duration: String(work.days.length) } } as TemplateDocumentData;
}

export async function buildInvoiceDocumentData(invoiceId: string): Promise<TemplateDocumentData> {
  const invoice = await prisma.leadInvoice.findUnique({ where: { id: invoiceId }, include: { lead: true, b2bLead: true, items: { orderBy: { displayOrder: "asc" } }, paymentOptions: { orderBy: { displayOrder: "asc" } } } });
  if (!invoice) throw new Error("Không tìm thấy Invoice.");
  const lead = invoice.lead ?? invoice.b2bLead;
  return { invoice: { number: invoice.invoiceNumber, bookingCode: invoice.bookingCode, date: date(invoice.createdAt), dueDate: date(invoice.dueDate), issuerName: invoice.issuerName, issuerContact: invoice.issuerContact ?? "", issuerEmail: invoice.issuerEmail ?? "", totalAmountUsd: money(invoice.amountUsd), depositAmountUsd: money(invoice.depositAmountUsd), depositDueDate: date(invoice.depositDueDate), balanceAmountUsd: money(invoice.balanceAmountUsd), items: invoice.items.map((item, index) => ({ number: index + 1, description: item.description, quantity: item.quantity, unit: item.unit, price: money(item.pricePerPaxUsd), amount: money(item.amountUsd) })), paymentOptions: invoice.paymentOptions.map((item) => ({ name: item.name, content: item.content })) }, customer: { name: invoice.billTo, contact: invoice.contact || lead?.phone || lead?.whatsapp || "", email: invoice.email ?? "" } } as TemplateDocumentData;
}

export async function buildEstimateDocumentData(estimateId: string): Promise<TemplateDocumentData> {
  const estimate = await prisma.invoiceEstimate.findUnique({ where: { id: estimateId }, include: { costItems: { orderBy: { displayOrder: "asc" } }, revenueItems: { orderBy: { displayOrder: "asc" } } } });
  if (!estimate) throw new Error("Không tìm thấy bảng dự toán.");
  const totalCost = estimate.costItems.reduce((sum, item) => sum + Number(item.amountVnd.toString()) + Number(item.vatVnd.toString()), 0);
  const totalRevenue = estimate.revenueItems.reduce((sum, item) => sum + Number(item.amountVnd.toString()), 0);
  return { estimate: { totalCost: vnd(totalCost), totalRevenue: vnd(totalRevenue), profit: vnd(totalRevenue - totalCost), costItems: estimate.costItems.map((item) => ({ category: item.category, unitPrice: vnd(Number(item.unitPriceVnd.toString())), quantity: item.quantity.toString(), amount: vnd(Number(item.amountVnd.toString())), vat: vnd(Number(item.vatVnd.toString())), note: item.note ?? "" })), revenueItems: estimate.revenueItems.map((item) => ({ settlementType: item.settlementType, description: item.category, unitPriceUsd: money(item.unitPriceUsd), quantity: item.quantity.toString(), amountUsd: money(item.amountUsd), amountVnd: vnd(Number(item.amountVnd.toString())) })) } } as TemplateDocumentData;
}

type Adapter = (sourceId: string) => Promise<TemplateDocumentData>;
export const TEMPLATE_DOCUMENT_ADAPTERS: Partial<Record<string, Adapter>> = { ITINERARY: buildItineraryDocumentData, INVOICE: buildInvoiceDocumentData, ESTIMATE: buildEstimateDocumentData };

export async function buildTemplateDocumentData(documentType: string, sourceId: string) {
  const adapter = TEMPLATE_DOCUMENT_ADAPTERS[documentType];
  if (!adapter) throw new Error(`Loại tài liệu ${documentType} chưa có adapter dữ liệu nghiệp vụ.`);
  const data = await adapter(sourceId);
  return JSON.parse(JSON.stringify(data)) as { [key: string]: TemplateDocumentValue };
}
