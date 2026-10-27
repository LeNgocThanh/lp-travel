export const BUILDER_DOCUMENT_TYPES = [
  { value: "ITINERARY", label: "Itinerary" },
  { value: "INVOICE", label: "Invoice" },
  { value: "ESTIMATE", label: "Dự toán" },
  { value: "QUOTATION", label: "Báo giá" },
  { value: "OTHER", label: "Khác" },
] as const;

export const BUILDER_VARIABLES: Record<string, { value: string; label: string; sample: string }[]> = {
  ITINERARY: [
    { value: "itinerary.title", label: "Tiêu đề lịch trình", sample: "Hanoi – Ha Long – Da Nang" },
    { value: "customer.name", label: "Tên khách hàng", sample: "Nguyen Van A" },
    { value: "lead.destination", label: "Điểm đến", sample: "Da Nang" },
    { value: "lead.travelDate", label: "Ngày khởi hành", sample: "21/06/2026" },
    { value: "itinerary.inclusions", label: "Inclusions", sample: "Accommodation, tours and transfers" },
    { value: "itinerary.exclusions", label: "Exclusions", sample: "Personal expenses and optional services" },
    { value: "itinerary.notes", label: "NOTES", sample: "Prices and conditions are subject to availability." },
  ],
  INVOICE: [
    { value: "invoice.number", label: "Số Invoice", sample: "INV-0001" },
    { value: "customer.name", label: "Bill To", sample: "Nguyen Van A" },
    { value: "customer.contact", label: "Contact", sample: "+84 912 345 678" },
    { value: "customer.email", label: "Email khách hàng", sample: "customer@example.com" },
    { value: "invoice.bookingCode", label: "Booking Code", sample: "LP-260926" },
    { value: "invoice.issuerName", label: "Invoice Issuer", sample: "Sales Executive" },
    { value: "invoice.issuerContact", label: "Contact người lập", sample: "+84 987 654 321" },
    { value: "invoice.issuerEmail", label: "Email người lập", sample: "sales@example.com" },
    { value: "invoice.date", label: "Invoice Date", sample: "30/09/2026" },
    { value: "invoice.totalAmountUsd", label: "Tổng tiền USD", sample: "$1,500.00" },
    { value: "invoice.depositAmountUsd", label: "Deposit", sample: "$750.00" },
    { value: "invoice.depositDueDate", label: "Hạn Deposit", sample: "26/09/2026" },
    { value: "invoice.balanceAmountUsd", label: "Balance", sample: "$750.00" },
    { value: "invoice.dueDate", label: "Due Date", sample: "15/11/2026" },
  ],
  ESTIMATE: [
    { value: "estimate.totalCost", label: "Tổng chi phí", sample: "25.000.000 ₫" },
    { value: "estimate.totalRevenue", label: "Tổng doanh thu", sample: "32.000.000 ₫" },
    { value: "estimate.profit", label: "Lợi nhuận", sample: "7.000.000 ₫" },
  ],
  QUOTATION: [
    { value: "quotation.number", label: "Số báo giá", sample: "QT-0001" },
    { value: "customer.name", label: "Tên khách hàng", sample: "Nguyen Van A" },
    { value: "quotation.total", label: "Tổng báo giá", sample: "$1,500.00" },
  ],
  OTHER: [],
};

export const BUILDER_DATASETS: Record<string, { value: string; label: string; columns: { value: string; label: string }[] }[]> = {
  ITINERARY: [{ value: "itinerary.days", label: "Các ngày lịch trình", columns: [{ value: "date", label: "Ngày" }, { value: "title", label: "Tiêu đề" }, { value: "transport", label: "Phương tiện" }, { value: "meals", label: "Bữa ăn" }, { value: "content", label: "Nội dung" }, { value: "accommodation", label: "Lưu trú" }, { value: "overnight", label: "Overnight" }, { value: "flight", label: "Flight" }, { value: "notes", label: "Ghi chú" }] }],
  INVOICE: [
    { value: "invoice.items", label: "Các dòng Invoice", columns: [{ value: "number", label: "Item" }, { value: "description", label: "Description" }, { value: "quantity", label: "Qty" }, { value: "unit", label: "Unit" }, { value: "price", label: "Price/P" }, { value: "amount", label: "Amount" }] },
    { value: "invoice.paymentOptions", label: "Payment Options", columns: [{ value: "name", label: "Tên" }, { value: "content", label: "Nội dung" }] },
  ],
  ESTIMATE: [
    { value: "estimate.costItems", label: "Chi phí dự toán", columns: [{ value: "category", label: "Hạng mục" }, { value: "unitPrice", label: "Đơn giá" }, { value: "quantity", label: "Số lượng" }, { value: "amount", label: "Thành tiền" }, { value: "vat", label: "VAT" }, { value: "note", label: "NOTE (TTTT NCC)" }] },
    { value: "estimate.revenueItems", label: "Quyết toán", columns: [{ value: "settlementType", label: "Quyết toán" }, { value: "description", label: "Danh mục" }, { value: "unitPriceUsd", label: "Đơn giá (USD)" }, { value: "quantity", label: "Số lượng" }, { value: "amountUsd", label: "Tiền đô" }, { value: "amountVnd", label: "Tiền Việt" }] },
  ],
  QUOTATION: [{ value: "quotation.items", label: "Các dòng báo giá", columns: [{ value: "description", label: "Mô tả" }, { value: "quantity", label: "Số lượng" }, { value: "amount", label: "Thành tiền" }] }],
  OTHER: [],
};

export const BUILDER_BUSINESS_BLOCKS: Record<string, { type: BuilderBlock["type"]; label: string }[]> = {
  ITINERARY: [
    { type: "itinerarySummary", label: "Bảng tóm tắt lịch trình" },
    { type: "itineraryDetails", label: "Chi tiết từng ngày" },
    { type: "itineraryInformation", label: "Inclusions / Exclusions / Notes" },
  ],
  INVOICE: [
    { type: "invoiceParties", label: "Bill To / Invoice Issuer" },
    { type: "invoiceItems", label: "Bảng Invoice Items" },
    { type: "invoiceTotals", label: "Total / Deposit / Balance" },
    { type: "paymentOptions", label: "Payment Options" },
  ],
  ESTIMATE: [
    { type: "estimateTables", label: "Chi phí / Quyết toán" },
    { type: "estimateProfit", label: "Chốt lời" },
  ],
  QUOTATION: [],
  OTHER: [],
};

export type BuilderBlock = {
  id: string;
  type: "heading" | "text" | "field" | "divider" | "spacer" | "repeater" | "itinerarySummary" | "itineraryDetails" | "itineraryInformation" | "invoiceParties" | "invoiceItems" | "invoiceTotals" | "paymentOptions" | "estimateTables" | "estimateProfit";
  content?: string;
  level?: 1 | 2 | 3;
  align?: "left" | "center" | "right";
  color?: string;
  label?: string;
  variable?: string;
  showLabel?: boolean;
  thickness?: number;
  style?: "solid" | "dashed" | "dotted";
  height?: number;
  dataset?: string;
  columns?: string[];
  backgroundColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  padding?: number;
  marginTop?: number;
};

export type BuilderPageSettings = { size: "A4"; orientation: "portrait" | "landscape"; margin: number; fontFamily: "Arial" | "Times New Roman" | "Calibri"; fontSize: number };
export type BuilderSchema = { page?: BuilderPageSettings; blocks: BuilderBlock[] };
export type BuilderMetadata = Record<string, string | number | boolean>;
