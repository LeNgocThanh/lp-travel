import ExcelJS from "exceljs";
import { apiUser } from "@/lib/route-auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const value = (input: { toString(): string }) => Number(input.toString());
const groupNames: Record<string, string> = { ACCOMMODATION: "1. Accommodation", TRANSPORTATION: "2. Transportation", SERVICES: "3. Services", TICKET_GUIDE: "4. Ticket and Guide", INSURANCE: "5. Insurance" };

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await apiUser(); if (!user) return response!;
  if (!(await hasResourceAction(user, "LEADS", "READ"))) return Response.json({ error: "Bạn không có quyền xem dự toán." }, { status: 403 });
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id }, select: { leadId: true, invoice: { include: { items: { orderBy: { displayOrder: "asc" } } } }, estimate: { include: { costItems: { orderBy: { displayOrder: "asc" } }, revenueItems: { orderBy: { displayOrder: "asc" } } } } } });
  if (!lead) return Response.json({ error: "Không tìm thấy Lead." }, { status: 404 });
  const revenues = lead.estimate?.revenueItems.length ? lead.estimate.revenueItems.map((item) => ({ settlementType: item.settlementType, category: item.category, unitPriceUsd: value(item.unitPriceUsd), quantity: value(item.quantity), amountUsd: value(item.amountUsd), amountVnd: value(item.amountVnd) })) : lead.invoice?.items.map((item) => ({ settlementType: "Tour", category: item.description, unitPriceUsd: value(item.pricePerPaxUsd), quantity: item.quantity, amountUsd: value(item.amountUsd), amountVnd: 0 })) ?? [];
  const costs = lead.estimate?.costItems ?? [];
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Dự toán", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [{ width: 24 }, { width: 28 }, { width: 17 }, { width: 13 }, { width: 18 }, { width: 16 }, { width: 28 }, { width: 38 }, { width: 4 }, { width: 15 }, { width: 30 }, { width: 17 }, { width: 13 }, { width: 17 }, { width: 18 }];
  sheet.addRow(["NHÓM", "HẠNG MỤC", "ĐƠN GIÁ", "SỐ LƯỢNG", "THÀNH TIỀN", "VAT", "NOTE (TTTT NCC)", "URL", "", "Quyết Toán", "Danh mục", "Đơn giá (USD)", "Số lượng", "Tiền đô", "Tiền Việt"]); const rowCount = Math.max(costs.length, revenues.length, 1);
  for (let index = 0; index < rowCount; index++) {
    const cost = costs[index]; const revenue = revenues[index];
    sheet.addRow([cost ? groupNames[cost.group] ?? cost.group : "", cost?.category ?? "", cost ? value(cost.unitPriceVnd) : "", cost ? value(cost.quantity) : "", cost ? value(cost.amountVnd) : "", cost ? value(cost.vatVnd) : "", cost?.note ?? "", cost?.url ?? "", "", revenue?.settlementType ?? "", revenue?.category ?? "", revenue?.unitPriceUsd ?? "", revenue?.quantity ?? "", revenue?.amountUsd ?? "", revenue?.amountVnd ?? ""]);
  }
  const totalRow = rowCount + 2; const profitRow = totalRow + 2;
  sheet.getCell(`D${totalRow}`).value = "TỔNG CHI PHÍ (gồm VAT)"; sheet.getCell(`E${totalRow}`).value = { formula: `SUM(E2:E${rowCount + 1})+SUM(F2:F${rowCount + 1})` };
  sheet.getCell(`L${totalRow}`).value = "TỔNG DOANH THU"; sheet.getCell(`N${totalRow}`).value = { formula: `SUM(N2:N${rowCount + 1})` }; sheet.getCell(`O${totalRow}`).value = { formula: `SUM(O2:O${rowCount + 1})` };
  sheet.getCell(`J${profitRow}`).value = "CHỐT LỜI = DOANH THU - CHI PHÍ"; sheet.getCell(`O${profitRow}`).value = { formula: `O${totalRow}-E${totalRow}` };
  sheet.getRow(1).eachCell((cell) => { cell.font = { bold: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } }; cell.alignment = { vertical: "middle", horizontal: "center" }; cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; });
  const buffer = await workbook.xlsx.writeBuffer(); const safe = lead.leadId.replace(/[^a-zA-Z0-9_-]+/g, "-") || "lead";
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="estimate-${safe}.xlsx"`, "Cache-Control": "no-store" } });
}
