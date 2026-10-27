import ExcelJS from "exceljs";
import { apiUser } from "@/lib/route-auth";
import { LEAD_DATE_KEYS, LEAD_EXCEL_COLUMNS, LEAD_NUMBER_KEYS } from "@/lib/lead-excel";
import { prisma } from "@/lib/prisma";
import { getLeadFieldAccess, hasResourceAction } from "@/lib/lead-access";

export async function GET() {
  const { user, response } = await apiUser();
  if (!user) return response!;
  if (!(await hasResourceAction(user, "LEADS", "EXPORT"))) return Response.json({ error: "Bạn không có quyền export Lead." }, { status: 403 });
  const { readable } = await getLeadFieldAccess(user);
  const labels = new Map((await prisma.leadFieldConfig.findMany({ where: { active: true }, select: { fieldKey: true, label: true } })).map((field) => [field.fieldKey, field.label]));
  const columns = LEAD_EXCEL_COLUMNS.filter(([key]) => readable.has(key === "assignedTo" ? "assignedToId" : key)).map(([key, header]) => [key, labels.get(key === "assignedTo" ? "assignedToId" : key) ?? header] as const);
  if (!columns.length) return Response.json({ error: "Vai trò của bạn chưa được cấp quyền đọc cột Lead nào." }, { status: 403 });
  const leads = await prisma.lead.findMany({ include: { assignedTo: { select: { fullName: true } } }, orderBy: [{ dateReceived: "desc" }, { createdAt: "desc" }] });
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Leads", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map(([key, header]) => ({ key, header, width: ["preference", "specialRequest", "remarks"].includes(key) ? 35 : 20 }));
  for (const lead of leads) {
    const row: Record<string, unknown> = {};
    for (const [key] of columns) {
      if (key === "assignedTo") row[key] = lead.assignedTo?.fullName ?? "";
      else { const value = lead[key as keyof typeof lead]; row[key] = value === null ? "" : LEAD_NUMBER_KEYS.has(key) && value !== "" ? Number(value) : value; }
    }
    sheet.addRow(row);
  }
  sheet.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } }; cell.alignment = { vertical: "middle", horizontal: "center" }; });
  sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(columns.length).letter}1` };
  for (const [key] of columns) if (LEAD_DATE_KEYS.has(key)) sheet.getColumn(key).numFmt = "dd/mm/yyyy";
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}
