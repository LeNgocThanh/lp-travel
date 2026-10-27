import "server-only";
import { prisma } from "@/lib/prisma";
import { buildTemplateDocumentData } from "@/lib/template-builder-adapters";
import { getTemplateDataValue, type TemplateDocumentData, type TemplateDocumentValue } from "@/lib/template-builder-document-data";

export const DATA_OPERATIONS = [
  { value: "DIRECT", label: "Lấy trực tiếp" }, { value: "LITERAL", label: "Giá trị cố định" }, { value: "CONCAT", label: "Ghép hai giá trị" },
  { value: "ADD", label: "Cộng" }, { value: "SUBTRACT", label: "Trừ" }, { value: "MULTIPLY", label: "Nhân" }, { value: "DIVIDE", label: "Chia" },
  { value: "PERCENTAGE", label: "Tính phần trăm" }, { value: "FIRST_NON_EMPTY", label: "Lấy giá trị đầu tiên có dữ liệu" },
  { value: "EXTRACT_DURATION_DAYS", label: "Tách số ngày từ Duration" }, { value: "ADD_DAYS", label: "Cộng ngày" },
] as const;
export const DATASET_OPERATIONS = [{ value: "DIRECT_LIST", label: "Dùng danh sách đã lưu" }, { value: "GENERATE_DURATION_RANGE", label: "Sinh ngày từ Duration" }] as const;
export const DATA_FORMATS = [{ value: "NONE", label: "Giữ nguyên" }, { value: "USD", label: "Tiền USD" }, { value: "VND", label: "Tiền Việt" }, { value: "DATE", label: "Ngày DD/MM/YYYY" }, { value: "UPPERCASE", label: "Chữ in hoa" }, { value: "LOWERCASE", label: "Chữ thường" }] as const;
export const DATA_VALUE_TYPES = [{ value: "STRING", label: "Văn bản" }, { value: "NUMBER", label: "Số" }, { value: "BOOLEAN", label: "Đúng / Sai" }, { value: "DATE", label: "Ngày" }] as const;

type Rule = { sourcePath: string | null; operation: string; operandPath: string | null; literalValue: string | null; format: string; defaultValue: string | null };

function numeric(value: TemplateDocumentValue | undefined) { const result = Number(typeof value === "string" ? value.replaceAll(",", "").replace(/[^0-9.-]/gu, "") : value); return Number.isFinite(result) ? result : 0; }
function format(value: TemplateDocumentValue | undefined, kind: string): TemplateDocumentValue {
  if (value === undefined || value === null || value === "") return "";
  if (kind === "USD") return numeric(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (kind === "VND") return `${numeric(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ₫`;
  if (kind === "DATE") { const parsed = new Date(String(value)); return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-GB", { timeZone: "UTC" }); }
  if (kind === "UPPERCASE") return String(value).toUpperCase();
  if (kind === "LOWERCASE") return String(value).toLowerCase();
  return value;
}

export function extractDurationDays(value: TemplateDocumentValue | undefined) {
  const text = String(value ?? "").trim();
  const firstNumber = text.match(/\d+/u);
  const days = Number(firstNumber?.[0] ?? 0);
  return Number.isInteger(days) && days > 0 ? days : 0;
}

function resolve(path: string | null, row: TemplateDocumentData, root: TemplateDocumentData) {
  if (!path) return undefined;
  if (path.startsWith("root.")) return getTemplateDataValue(root, path.slice(5));
  if (path.startsWith("row.")) return getTemplateDataValue(row, path.slice(4));
  return getTemplateDataValue(row, path);
}

function evaluate(rule: Rule, row: TemplateDocumentData, root: TemplateDocumentData = row) {
  const first = resolve(rule.sourcePath, row, root);
  const second = resolve(rule.operandPath, row, root);
  let value: TemplateDocumentValue | undefined;
  if (rule.operation === "LITERAL") value = rule.literalValue ?? "";
  else if (rule.operation === "CONCAT") value = `${first ?? ""}${rule.literalValue ?? " "}${second ?? ""}`;
  else if (rule.operation === "ADD") value = numeric(first) + numeric(second);
  else if (rule.operation === "SUBTRACT") value = numeric(first) - numeric(second);
  else if (rule.operation === "MULTIPLY") value = numeric(first) * numeric(second);
  else if (rule.operation === "DIVIDE") value = numeric(second) === 0 ? 0 : numeric(first) / numeric(second);
  else if (rule.operation === "PERCENTAGE") value = numeric(first) * numeric(second) / 100;
  else if (rule.operation === "FIRST_NON_EMPTY") value = first || second || rule.literalValue || "";
  else if (rule.operation === "EXTRACT_DURATION_DAYS") value = extractDurationDays(first);
  else if (rule.operation === "ADD_DAYS") { const parsed = new Date(String(first)); if (Number.isNaN(parsed.getTime())) value = ""; else { parsed.setUTCDate(parsed.getUTCDate() + numeric(second) + numeric(rule.literalValue)); value = parsed.toISOString().slice(0, 10); } }
  else value = first;
  return format(value === undefined || value === null || value === "" ? rule.defaultValue ?? "" : value, rule.format);
}

function setPath(target: TemplateDocumentData, path: string, value: TemplateDocumentValue) {
  const parts = path.split(".");
  if (parts.some((part) => ["__proto__", "prototype", "constructor"].includes(part.toLowerCase()))) throw new Error("Đường dẫn dữ liệu không an toàn.");
  let current: { [key: string]: TemplateDocumentValue } = target;
  parts.forEach((part, index) => { if (index === parts.length - 1) current[part] = value; else { const existing = current[part]; if (!existing || typeof existing !== "object" || Array.isArray(existing)) current[part] = {}; current = current[part] as { [key: string]: TemplateDocumentValue }; } });
}

export async function buildConfiguredTemplateDocumentData(documentType: string, sourceId: string) {
  const source = await prisma.documentDataSource.findUnique({ where: { documentType }, include: { fields: { where: { active: true }, orderBy: { displayOrder: "asc" } }, datasets: { where: { active: true }, orderBy: { displayOrder: "asc" }, include: { columns: { where: { active: true }, orderBy: { displayOrder: "asc" } } } } } });
  if (!source?.active) throw new Error(`Chưa cấu hình nguồn dữ liệu hoạt động cho ${documentType}.`);
  const raw = await buildTemplateDocumentData(source.adapterCode, sourceId);
  const output: TemplateDocumentData = {};
  for (const field of source.fields) setPath(output, field.key, evaluate(field, raw));
  for (const dataset of source.datasets) {
    const value = getTemplateDataValue(raw, dataset.sourcePath);
    const rows: TemplateDocumentData[] = dataset.operation === "GENERATE_DURATION_RANGE"
      ? Array.from({ length: Math.min(extractDurationDays(value), dataset.maxRows) }, (_, index) => ({ value: dataset.startValue + index, index }))
      : Array.isArray(value) ? value.filter((row): row is { [key: string]: TemplateDocumentValue } => !!row && typeof row === "object" && !Array.isArray(row)) : [];
    const mapped = rows.map((row) => { const result: TemplateDocumentData = {}; for (const column of dataset.columns) result[column.key] = evaluate(column, row, raw); return result; });
    setPath(output, dataset.key, mapped);
  }
  return output;
}
