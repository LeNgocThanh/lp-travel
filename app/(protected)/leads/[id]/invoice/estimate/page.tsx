import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveInvoiceEstimate } from "@/app/actions/invoice-estimates";
import { InvoiceEstimateEditor } from "@/components/invoice-estimate-editor";
import { InvoiceEstimateExportButtons } from "@/components/invoice-estimate-export-buttons";
import { Button } from "@/components/ui/button";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

export default async function InvoiceEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(); const { id } = await params;
  const [canRead, canUpdate] = await Promise.all([hasResourceAction(actor, "LEADS", "READ"), hasResourceAction(actor, "LEADS", "UPDATE")]);
  if (!canRead) redirect("/leads");
  const lead = await prisma.lead.findUnique({ where: { id }, select: { leadId: true, invoice: { include: { items: { orderBy: { displayOrder: "asc" } } } }, estimate: { include: { costItems: { orderBy: { displayOrder: "asc" } }, revenueItems: { orderBy: { displayOrder: "asc" } } } } } });
  if (!lead) notFound();
  const estimate = lead.estimate;
  const initialCosts = estimate?.costItems.map((item) => ({ group: item.group, category: item.category, unitPriceVnd: item.unitPriceVnd.toString(), quantity: item.quantity.toString(), vatVnd: item.vatVnd.toString(), note: item.note ?? "", url: item.url ?? "" })) ?? [];
  const revenues = estimate?.revenueItems.length ? estimate.revenueItems.map((item) => ({ settlementType: item.settlementType, category: item.category, unitPriceUsd: item.unitPriceUsd.toString(), quantity: item.quantity.toString(), amountUsd: item.amountUsd.toString(), amountVnd: item.amountVnd.toString() })) : lead.invoice?.items.length ? lead.invoice.items.map((item) => ({ settlementType: "Tour", category: item.description, unitPriceUsd: item.pricePerPaxUsd.toString(), quantity: item.quantity.toString(), amountUsd: item.amountUsd.toString(), amountVnd: "0" })) : [{ settlementType: "Tour", category: "", unitPriceUsd: "0", quantity: "1", amountUsd: "0", amountVnd: "0" }];
  return <div className="invoice-estimate-print space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Bảng dự toán</h1><p className="text-sm text-muted-foreground">Lead {lead.leadId}{lead.invoice ? ` · Invoice ${lead.invoice.invoiceNumber}` : " · chưa tạo Invoice"}</p></div><div className="flex gap-2 print:hidden"><InvoiceEstimateExportButtons leadId={id} />{lead.invoice ? <Button nativeButton={false} render={<Link href={`/leads/${id}/invoice`} />} variant="outline">← Invoice</Button> : <Button nativeButton={false} render={<Link href={`/leads/${id}`} />} variant="outline">← Lead</Button>}</div></div>{canUpdate ? <WorkCaseActionForm action={saveInvoiceEstimate.bind(null, id)}><InvoiceEstimateEditor initialCosts={initialCosts} revenues={revenues} editableRevenues /></WorkCaseActionForm> : <InvoiceEstimateEditor initialCosts={initialCosts} revenues={revenues} editableRevenues readOnly />}</div>;
}
