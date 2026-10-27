"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Download, Eye, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import { FilePreview } from "@/components/files/file-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FileItem } from "@/types/file";

const COST_GROUPS = [
  { value: "ACCOMMODATION", label: "1. Accommodation" },
  { value: "TRANSPORTATION", label: "2. Transportation" },
  { value: "SERVICES", label: "3. Services" },
  { value: "TICKET_GUIDE", label: "4. Ticket and Guide" },
  { value: "INSURANCE", label: "5. Insurance" },
] as const;

export type EstimateCostInitial = { group: string; category: string; unitPriceVnd: string; quantity: string; vatVnd: string; note: string; url: string };
export type EstimateRevenueInitial = { settlementType: string; category: string; unitPriceUsd: string; quantity: string; amountUsd: string; amountVnd: string };
// type CostRow = EstimateCostInitial & { key: number };

const number = (value: string) => Number(value) || 0;
const vnd = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ₫`;
const usd = (value: string | number) => Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });


/* ------------------------------------------------------------------ */
/* Ô nhập số có dấu phân cách hàng nghìn                               */
/* ------------------------------------------------------------------ */

type NumberLocale = "vi" | "en";
type CostRow = EstimateCostInitial & { key: number; unitPriceVatVnd: string; amountVnd: string; totalVatVnd: string };
type CostField = Exclude<keyof CostRow, "key">;

const VAT_RATE = 0.08;
const round2 = (value: number) => Math.round(value * 100) / 100;
const emptyCost = (key: number, group: string): CostRow => ({ key, group, category: "", unitPriceVnd: "0", unitPriceVatVnd: "0", quantity: "1", amountVnd: "0", vatVnd: "0", totalVatVnd: "0", note: "", url: "" });
const costLineTotal = (item: CostRow) => number(item.totalVatVnd); // Tiền có VAT

// vi: 1.234.567,89   |   en: 1,234,567.89
const SEPARATORS = {
  vi: { group: ".", decimal: "," },
  en: { group: ",", decimal: "." },
} as const;

/** "1234567.5" -> "1.234.567,5" (vi) hoặc "1,234,567.5" (en) */
function formatRaw(raw: string, locale: NumberLocale) {
  if (!raw) return "";
  const { group, decimal } = SEPARATORS[locale];
  const [intPart, fracPart = ""] = raw.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return raw.includes(".") ? `${grouped}${decimal}${fracPart}` : grouped;
}

/** Chuỗi người dùng gõ -> giá trị thô "1234567.5" (chỉ gồm số và dấu chấm thập phân) */
function parseInput(text: string, locale: NumberLocale, maxDecimals: number) {
  const { decimal } = SEPARATORS[locale];
  let intPart = "";
  let fracPart = "";
  let hasDecimal = false;
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") {
      if (hasDecimal) {
        if (fracPart.length < maxDecimals) fracPart += ch;
      } else intPart += ch;
    } else if (ch === decimal && maxDecimals > 0 && !hasDecimal) hasDecimal = true;
  }
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (hasDecimal) return `${intPart || "0"}.${fracPart}`;
  return intPart;
}

type NumberFieldProps = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  locale?: NumberLocale;
  maxDecimals?: number;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Giá trị điền lại khi người dùng xóa trống rồi rời ô (vd "0") */
  emptyAs?: string;
};

function NumberField({ value, onChange, name, locale = "vi", maxDecimals = 2, suffix, placeholder, disabled, required, emptyAs }: NumberFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);
  const { decimal } = SEPARATORS[locale];
  const isSignificant = (ch: string) => (ch >= "0" && ch <= "9") || ch === decimal;
  const getInput = () => wrapperRef.current?.querySelector<HTMLInputElement>("input:not([type=hidden])") ?? null;

  // Giữ vị trí con trỏ sau khi thêm/bớt dấu phân cách
  useLayoutEffect(() => {
    const input = getInput();
    if (caretRef.current === null || !input || document.activeElement !== input) {
      caretRef.current = null;
      return;
    }
    const target = caretRef.current;
    let count = 0;
    let pos = 0;
    while (pos < input.value.length && count < target) {
      if (isSignificant(input.value[pos])) count++;
      pos++;
    }
    input.setSelectionRange(pos, pos);
    caretRef.current = null;
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    const caret = event.target.selectionStart ?? text.length;
    caretRef.current = [...text.slice(0, caret)].filter(isSignificant).length;
    onChange(parseInput(text, locale, maxDecimals));
    forceRender((n) => n + 1);
  }

  function handleBlur() {
    if (!value && emptyAs !== undefined) onChange(emptyAs);
    else if (value.endsWith(".")) onChange(value.slice(0, -1));
  }

  return (
    <div ref={wrapperRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        value={formatRaw(value, locale)}
        onChange={handleChange}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={handleBlur}
        className={`text-right tabular-nums ${suffix ? "pr-7" : ""}`}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload / xem / tải chứng từ                                         */
/* ------------------------------------------------------------------ */

function DocumentUrlInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/travel-files?folder=chung_tu_ke_toan", { method: "POST", body: form });
      const body = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !body.url) throw new Error(body.message || "Không thể upload chứng từ.");
      onChange(body.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể upload chứng từ.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  let name = "Chứng từ";
  try {
    name = decodeURIComponent(new URL(value, "https://local.invalid").pathname.split("/").pop() || name);
  } catch {
    /* Giữ tên mặc định khi URL chưa hợp lệ. */
  }
  const downloadUrl = value.includes("/api/travel-files/") ? `${value}${value.includes("?") ? "&" : "?"}download=1` : value;
  const file: FileItem = { key: value, name, isFolder: false, storedName: name, url: value, downloadUrl };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Dán URL hoặc upload" className="min-w-0 flex-1" />
        <input ref={inputRef} type="file" className="hidden" disabled={disabled || pending} onChange={(event) => void upload(event.target.files?.[0])} />
        <Button type="button" size="icon-sm" variant="outline" disabled={disabled || pending} onClick={() => inputRef.current?.click()} aria-label="Upload chứng từ">
          {pending ? <LoaderCircle className="animate-spin" /> : <Upload />}
        </Button>
        {value && (
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => setPreviewing(true)} aria-label="Xem chứng từ">
            <Eye />
          </Button>
        )}
        {value && (
          <Button nativeButton={false} render={<a href={downloadUrl} download={name} />} size="icon-sm" variant="ghost" aria-label="Tải chứng từ">
            <Download />
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {previewing && <FilePreview file={file} siblings={[file]} onClose={() => setPreviewing(false)} onNavigate={() => undefined} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form chính                                                          */
/* ------------------------------------------------------------------ */

const thClass = "px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function InvoiceEstimateEditor({ initialCosts, revenues, readOnly = false, editableRevenues = false }: { initialCosts: EstimateCostInitial[]; revenues: EstimateRevenueInitial[]; readOnly?: boolean; editableRevenues?: boolean }) {
  const [nextKey, setNextKey] = useState(initialCosts.length);
  const [costs, setCosts] = useState<CostRow[]>(() =>
    initialCosts.map((item, key) => {
      const quantity = number(item.quantity);
      const amount = round2(number(item.unitPriceVnd) * quantity);
      const total = round2(amount + number(item.vatVnd));
      return {
        ...item,
        key,
        amountVnd: String(amount),
        totalVatVnd: String(total),
        unitPriceVatVnd: String(quantity > 0 ? round2(total / quantity) : 0),
      };
    }),
  );

  const [revenueRows, setRevenueRows] = useState(revenues);

  function updateCost(key: number, field: CostField, value: string) {
    setCosts((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, [field]: value };
        const quantity = number(next.quantity);

        let amount: number; // Thành tiền (chưa VAT)
        let vat: number;
        let total: number;  // Tiền có VAT

        switch (field) {
          case "unitPriceVatVnd":
          case "quantity": // Tiền có VAT = Đơn giá có VAT * Số lượng
            total = round2(number(next.unitPriceVatVnd) * quantity);
            amount = round2(total / (1 + VAT_RATE));
            vat = round2(total - amount);
            break;
          case "totalVatVnd": // Nhập Tiền có VAT
            total = number(value);
            amount = round2(total / (1 + VAT_RATE));
            vat = round2(total - amount);
            break;
          case "amountVnd": // Nhập Thành tiền
            amount = number(value);
            vat = round2(amount * VAT_RATE);
            total = round2(amount + vat);
            break;
          case "vatVnd": // Nhập VAT
            vat = number(value);
            amount = round2(vat / VAT_RATE);
            total = round2(amount + vat);
            break;
          default:
            return next;
        }

        // Chỉ ghi đè các ô KHÔNG phải ô đang nhập (tránh nhảy giá trị khi gõ)
        if (field !== "amountVnd") next.amountVnd = String(amount);
        if (field !== "vatVnd") next.vatVnd = String(vat);
        if (field !== "totalVatVnd") next.totalVatVnd = String(total);
        if (field !== "unitPriceVatVnd" && field !== "quantity" && quantity > 0) next.unitPriceVatVnd = String(round2(total / quantity));
        // Đơn giá chưa VAT: trường ẩn, vẫn submit như cũ
        next.unitPriceVnd = quantity > 0 ? String(round2(amount / quantity)) : "0";
        return next;
      }),
    );
  }

  function addCost(group: string) {
    setCosts((current) => [...current, emptyCost(nextKey, group)]);
    setNextKey((value) => value + 1);
  }

  function updateRevenue(index: number, field: keyof EstimateRevenueInitial, value: string) {
    setRevenueRows((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "unitPriceUsd" || field === "quantity") {
          next.amountUsd = String(Math.round(number(next.unitPriceUsd) * number(next.quantity) * 100) / 100);
        }
        return next;
      }),
    );
  }

  const totalCost = costs.reduce((sum, item) => sum + costLineTotal(item), 0);
  const totalRevenueVnd = revenueRows.reduce((sum, item) => sum + number(item.amountVnd), 0);
  const totalRevenueUsd = revenueRows.reduce((sum, item) => sum + number(item.amountUsd), 0);
  const exchangeRate = totalRevenueUsd > 0 ? round2(totalRevenueVnd / totalRevenueUsd) : 0;
  const profit = totalRevenueVnd - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : null;
  // const revenueCostRatio = totalCost > 0 ? totalRevenueVnd / totalCost : null;

  return (
    <div className="space-y-6">
      <input type="hidden" name="costCount" value={costs.length} />
      <input type="hidden" name="revenueCount" value={revenueRows.length} />

      {/* Tóm tắt */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Tỷ giá USD/VNĐ</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{exchangeRate > 0 ? vnd(exchangeRate) : "—"}</p>
          <input type="hidden" name="exchangeRateVnd" value={exchangeRate > 0 ? String(exchangeRate) : ""} />
          <p className="mt-2 text-xs text-muted-foreground">Tự tính = Tổng Tiền Việt ÷ Tổng Tiền đô. Nhập Tiền Việt ở phần Quyết toán.</p>
        </div>
        {/* TỔNG CHI PHÍ - TÔNG VÀNG */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Tổng chi phí (gồm VAT)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">{vnd(totalCost)}</p>
        </div>

        {/* TỔNG DOANH THU - TÔNG HỒNG */}
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm font-medium text-rose-900 dark:text-rose-200">Tổng doanh thu</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-rose-700 dark:text-rose-400">{vnd(totalRevenueVnd)}</p>
          <p className="mt-1 text-xs tabular-nums text-rose-600/80 dark:text-rose-300/80">$ {usd(totalRevenueUsd)}</p>
        </div>

        {/* CHỐT LỜI - TÔNG XANH LÁ (Nếu lỗ sẽ dùng màu Destructive/Đỏ) */}
        <div className={`rounded-lg border p-4 ${profit >= 0 ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10"}`}>
          <p className="text-sm font-medium text-muted-foreground">Chốt lời = Doanh thu − Chi phí</p>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            {vnd(profit)}
          </p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            % Lãi: {profitPercent === null ? "—" : `${profitPercent.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`}
          </p>
        </div>
      </div>

      {/* Chi phí dự toán */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Chi phí dự toán</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1350px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[7%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[18%]" />
              <col className="w-[44px]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr>
                <th className={`${thClass} text-left`}>Hạng mục</th>
                <th className={`${thClass} text-right`}>Đơn giá có VAT</th>
                <th className={`${thClass} text-right`}>Số lượng</th>
                <th className={`${thClass} text-right`}>Thành tiền</th>
                <th className={`${thClass} text-right`}>VAT</th>
                <th className={`${thClass} text-right`}>Tiền có VAT</th>
                <th className={`${thClass} text-left`}>Note (TTTT NCC)</th>
                <th className={`${thClass} text-left`}>Chứng từ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {COST_GROUPS.map((group) => (
                <GroupRows key={group.value} group={group} costs={costs} readOnly={readOnly} updateCost={updateCost} addCost={addCost} removeCost={(key) => setCosts((current) => current.filter((row) => row.key !== key))} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50">
                <td colSpan={3} className="px-3 py-3 text-right font-bold">TỔNG CHI PHÍ (gồm VAT)</td>
                <td colSpan={6} className="px-3 py-3 text-left text-base font-bold tabular-nums">{vnd(totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Quyết toán */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quyết toán</h2>
          {editableRevenues && !readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => setRevenueRows((current) => [...current, { settlementType: "Tour", category: "", unitPriceUsd: "0", quantity: "1", amountUsd: "0", amountVnd: "0" }])}>
              <Plus /> Dòng quyết toán
            </Button>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              <col className="w-[9%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              {editableRevenues && <col className="w-[44px]" />}
            </colgroup>
            <thead className="bg-muted/50">
              <tr>
                <th className={`${thClass} text-left`}>Quyết toán</th>
                <th className={`${thClass} text-left`}>Danh mục</th>
                <th className={`${thClass} text-right`}>Đơn giá (USD)</th>
                <th className={`${thClass} text-right`}>Số lượng</th>
                <th className={`${thClass} text-right`}>Tiền đô</th>
                <th className={`${thClass} text-right`}>Tiền Việt</th>
                {editableRevenues && <th />}
              </tr>
            </thead>
            <tbody>
              {revenueRows.map((item, index) => (
                <tr key={index} className="border-t hover:bg-muted/30">
                  <td className="p-1.5">
                    {editableRevenues ? <Input disabled={readOnly} name={`revenueSettlementType_${index}`} value={item.settlementType} onChange={(event) => updateRevenue(index, "settlementType", event.target.value)} required /> : <span className="block px-2">{item.settlementType}</span>}
                  </td>
                  <td className="p-1.5">
                    {editableRevenues ? <Input disabled={readOnly} name={`revenueCategory_${index}`} value={item.category} onChange={(event) => updateRevenue(index, "category", event.target.value)} required /> : <span className="block px-2">{item.category}</span>}
                  </td>
                  <td className="p-1.5">
                    {editableRevenues ? (
                      <NumberField disabled={readOnly} name={`revenueUnitPriceUsd_${index}`} locale="en" suffix="$" value={item.unitPriceUsd} onChange={(value) => updateRevenue(index, "unitPriceUsd", value)} emptyAs="0" required />
                    ) : (
                      <span className="block px-2 text-right tabular-nums">{usd(item.unitPriceUsd)}</span>
                    )}
                  </td>
                  <td className="p-1.5">
                    {editableRevenues ? (
                      <NumberField disabled={readOnly} name={`revenueQuantity_${index}`} value={item.quantity} onChange={(value) => updateRevenue(index, "quantity", value)} emptyAs="0" required />
                    ) : (
                      <span className="block px-2 text-right tabular-nums">{item.quantity}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {usd(item.amountUsd)}
                    <input type="hidden" name={`revenueAmountUsd_${index}`} value={item.amountUsd} />
                  </td>
                  <td className="p-1.5">
                    <NumberField disabled={readOnly} name={`revenueAmountVnd_${index}`} suffix="₫" value={item.amountVnd} onChange={(value) => updateRevenue(index, "amountVnd", value)} emptyAs="0" required />
                  </td>
                  {editableRevenues && (
                    <td className="p-1.5">
                      <Button type="button" size="icon-sm" variant="ghost" disabled={readOnly || revenueRows.length === 1} onClick={() => setRevenueRows((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa dòng quyết toán">
                        <Trash2 />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50">
                <td colSpan={4} className="px-3 py-3 text-right font-bold">TỔNG DOANH THU</td>
                <td className="px-3 py-3 text-right font-bold tabular-nums">{usd(totalRevenueUsd)}</td>
                <td className="px-3 py-3 text-right font-bold tabular-nums">{vnd(totalRevenueVnd)}</td>
                {editableRevenues && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-1 flex justify-end border-t bg-background/90 px-1 py-3 backdrop-blur">
          <Button type="submit">Lưu bảng dự toán</Button>
        </div>
      )}
    </div>
  );
}

function GroupRows({ group, costs, readOnly, updateCost, addCost, removeCost }: { group: (typeof COST_GROUPS)[number]; costs: CostRow[]; readOnly: boolean; updateCost: (key: number, field: CostField, value: string) => void; addCost: (group: string) => void; removeCost: (key: number) => void }) {
  const rows = costs.filter((item) => item.group === group.value);
  const subtotal = rows.reduce((sum, item) => sum + costLineTotal(item), 0);

  return (
    <>
      <tr className="border-t bg-muted/40">
        <td colSpan={9} className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">{group.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">Cộng nhóm: <span className="font-medium text-foreground">{vnd(subtotal)}</span></span>
              {!readOnly && (
                <Button type="button" size="sm" variant="outline" onClick={() => addCost(group.value)}>
                  <Plus /> Dòng
                </Button>
              )}
            </div>
          </div>
        </td>
      </tr>
      {rows.length === 0 && (
        <tr className="border-t">
          <td colSpan={9} className="px-3 py-3 text-center text-xs text-muted-foreground">Chưa có dòng nào</td>
        </tr>
      )}
      {rows.map((item) => {
        const index = costs.findIndex((row) => row.key === item.key);
        return (
          <tr key={item.key} className="border-t align-top hover:bg-muted/30">
            <td className="p-1.5">
              <input type="hidden" name={`costGroup_${index}`} value={item.group} />
              <Input disabled={readOnly} name={`costCategory_${index}`} value={item.category} onChange={(event) => updateCost(item.key, "category", event.target.value)} placeholder="Tên hạng mục" required />
            </td>
            <td className="p-1.5">
              {/* Đơn giá chưa VAT (tự tính) vẫn submit để server giữ nguyên */}
              <input type="hidden" name={`costUnitPriceVnd_${index}`} value={item.unitPriceVnd} />
              <NumberField disabled={readOnly} suffix="₫" value={item.unitPriceVatVnd} onChange={(value) => updateCost(item.key, "unitPriceVatVnd", value)} emptyAs="0" />
            </td>
            <td className="p-1.5">
              <NumberField disabled={readOnly} name={`costQuantity_${index}`} value={item.quantity} onChange={(value) => updateCost(item.key, "quantity", value)} emptyAs="0" required />
            </td>
            <td className="p-1.5">
              <NumberField disabled={readOnly} suffix="₫" value={item.amountVnd} onChange={(value) => updateCost(item.key, "amountVnd", value)} emptyAs="0" />
            </td>
            <td className="p-1.5">
              <NumberField disabled={readOnly} name={`costVatVnd_${index}`} suffix="₫" value={item.vatVnd} onChange={(value) => updateCost(item.key, "vatVnd", value)} emptyAs="0" required />
            </td>
            <td className="p-1.5">
              <NumberField disabled={readOnly} suffix="₫" value={item.totalVatVnd} onChange={(value) => updateCost(item.key, "totalVatVnd", value)} emptyAs="0" />
            </td>
            <td className="p-1.5">
              <Input disabled={readOnly} name={`costNote_${index}`} value={item.note} onChange={(event) => updateCost(item.key, "note", event.target.value)} placeholder="Ghi chú" />
            </td>
            <td className="p-1.5">
              <input type="hidden" name={`costUrl_${index}`} value={item.url} />
              <DocumentUrlInput disabled={readOnly} value={item.url} onChange={(value) => updateCost(item.key, "url", value)} />
            </td>
            <td className="p-1.5">
              <Button type="button" size="icon-sm" variant="ghost" disabled={readOnly} onClick={() => removeCost(item.key)} aria-label="Xóa dòng">
                <Trash2 />
              </Button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
