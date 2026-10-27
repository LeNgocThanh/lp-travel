import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { PaymentOptionOrderSelector } from "@/components/payment-option-order-selector";
import { InvoiceItemsEditor, type InvoiceItemInitial } from "@/components/invoice-items-editor";
import { InvoiceDueDateInput } from "@/components/invoice-due-date-input";
import { InvoiceGeneralFields } from "@/components/invoice-general-fields";

type Option = { id: string; name: string };
type Template = { id: string; name: string; type: string; isDefault: boolean };
type Initial = { invoiceNumber: string; billTo: string; contact: string; email: string; bookingCode: string; dueDate: string; dateConfirmation: string; issuerName: string; issuerContact: string; issuerEmail: string; items: InvoiceItemInitial[]; depositPercent: string; depositDueDays: number; paymentOptionIds: string[]; headerTemplateId: string; footerTemplateId: string };
const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function InvoiceForm({ action, initial, options, templates }: { action: (formData: FormData) => void | Promise<void>; initial: Initial; options: Option[]; templates: Template[] }) {
  return <WorkCaseActionForm action={action} className="space-y-5"><Card className="grid gap-3 p-5 md:grid-cols-2"><InvoiceGeneralFields initial={{ invoiceNumber: initial.invoiceNumber, bookingCode: initial.bookingCode, billTo: initial.billTo, contact: initial.contact, email: initial.email }} /><InvoiceDueDateInput initialValue={initial.dueDate} dateConfirmation={initial.dateConfirmation} /><label className="space-y-1 text-sm font-medium">Invoice Issuer<Input value={initial.issuerName} readOnly /></label><label className="space-y-1 text-sm font-medium">Issuer Contact<Input value={initial.issuerContact} readOnly /></label><label className="space-y-1 text-sm font-medium">Issuer Email<Input type="email" value={initial.issuerEmail} readOnly /></label><p className="self-end rounded-md bg-muted p-3 text-sm">Deposit: {initial.depositPercent}% · trước Due Date {initial.depositDueDays} ngày. Balance = Total Amount - Deposit.</p><InvoiceItemsEditor initialItems={initial.items} /><PaymentOptionOrderSelector options={options} initialIds={initial.paymentOptionIds} /><label className="space-y-1 text-sm font-medium">Header<select name="headerTemplateId" defaultValue={initial.headerTemplateId || templates.find((item) => item.type === "HEADER" && item.isDefault)?.id || ""} className={selectClass}><option value="">Không dùng</option>{templates.filter((item) => item.type === "HEADER").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Footer<select name="footerTemplateId" defaultValue={initial.footerTemplateId || templates.find((item) => item.type === "FOOTER" && item.isDefault)?.id || ""} className={selectClass}><option value="">Không dùng</option>{templates.filter((item) => item.type === "FOOTER").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></Card><div className="flex justify-end"><Button type="submit">Lưu và xem Invoice</Button></div></WorkCaseActionForm>;
}
