"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

type Values = { invoiceNumber: string; bookingCode: string; billTo: string; contact: string; email: string };

export function InvoiceGeneralFields({ initial }: { initial: Values }) {
  const [values, setValues] = useState(initial);
  function update(field: keyof Values, value: string) { setValues((current) => ({ ...current, [field]: value })); }
  return <><label className="space-y-1 text-sm font-medium">Invoice No.<Input name="invoiceNumber" value={values.invoiceNumber} onChange={(event) => update("invoiceNumber", event.target.value)} required /></label><label className="space-y-1 text-sm font-medium">Booking Code<Input name="bookingCode" value={values.bookingCode} onChange={(event) => update("bookingCode", event.target.value)} required /></label><label className="space-y-1 text-sm font-medium">Bill to<Input name="billTo" value={values.billTo} onChange={(event) => update("billTo", event.target.value)} required /></label><label className="space-y-1 text-sm font-medium">Contact<Input name="contact" value={values.contact} onChange={(event) => update("contact", event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Email<Input name="email" type="email" value={values.email} onChange={(event) => update("email", event.target.value)} /></label></>;
}
