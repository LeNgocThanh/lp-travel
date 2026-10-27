import { createLead } from "@/app/actions/leads";
import type { B2BLead, Lead } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

type Option = { id: string; name: string };
type Props = { action?: (formData: FormData) => unknown | Promise<unknown>; item?: Lead | B2BLead; defaultLeadSource?: string; channels: Option[]; countries: Option[]; leadSources: Option[]; travelTypes: Option[]; leadStatuses: Option[]; leadQualities: Option[]; preferredContacts: Option[]; hotelCategories: Option[]; bookingStatuses: Option[]; paymentStatuses: Option[]; followUpStatuses: Option[]; lostReasons: Option[]; mealPreferences: Option[]; users: Option[]; readableFields?: string[]; writableFields?: string[] };
const fieldClass = "space-y-1.5";

function BaseTextField({ name, label, type = "text", required, list, min, step, defaultValue, readOnly }: { name: string; label: string; type?: string; required?: boolean; list?: string; min?: string; step?: string; defaultValue?: string | number; readOnly?: boolean }) {
  return <div className={fieldClass}><Label htmlFor={`lead-${name}`}>{label}{required ? " *" : ""}</Label><Input id={`lead-${name}`} name={name} type={type} required={required} list={list} min={min} step={step} defaultValue={defaultValue} readOnly={readOnly} /></div>;
}

function Suggestions({ id, items }: { id: string; items: Option[] }) {
  return <datalist id={id}>{items.map((item) => <option key={item.id} value={item.name} />)}</datalist>;
}

const textValue = (value: unknown) => value === null || value === undefined ? "" : String(value);
const dateValue = (value: Date | null | undefined) => value?.toISOString().slice(0, 10) ?? "";

export function LeadForm({ action = createLead, item, defaultLeadSource = "", channels, countries, leadSources, travelTypes, leadStatuses, leadQualities, preferredContacts, hotelCategories, bookingStatuses, paymentStatuses, followUpStatuses, lostReasons, mealPreferences, users, readableFields, writableFields }: Props) {
  const readable = new Set(readableFields); const writable = new Set(writableFields); const restricted = Boolean(item && readableFields);
  const TextField = (props: Parameters<typeof BaseTextField>[0]) => !restricted || readable.has(props.name) ? <BaseTextField {...props} readOnly={restricted && !writable.has(props.name)} /> : null;
  return <WorkCaseActionForm action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <TextField name="leadId" label="Lead ID" required defaultValue={item?.leadId} /><TextField name="dateReceived" label="Date Received" type="date" required defaultValue={dateValue(item?.dateReceived)} /><TextField name="leadSource" label="Lead Source" list="lead-source-options" defaultValue={textValue(item?.leadSource ?? defaultLeadSource)} />
    <TextField name="channel" label="Channel" list="channel-options" defaultValue={textValue(item?.channel)} /><TextField name="campaign" label="Campaign" defaultValue={textValue(item?.campaign)} /><TextField name="customerName" label="Customer Name" required defaultValue={item?.customerName} />
    <TextField name="country" label="Country" list="country-options" defaultValue={textValue(item?.country)} /><TextField name="phone" label="Phone" type="tel" defaultValue={textValue(item?.phone)} /><TextField name="whatsapp" label="WhatsApp" type="tel" defaultValue={textValue(item?.whatsapp)} />
    <TextField name="preferredContact" label="Preferred Contact" list="preferred-contact-options" defaultValue={textValue(item?.preferredContact)} /><TextField name="email" label="Email" type="email" defaultValue={textValue(item?.email)} /><TextField name="travelDate" label="Travel Date" type="date" defaultValue={dateValue(item?.travelDate)} />
    <TextField name="numberOfPax" label="No. of Pax" type="number" min="0" step="1" defaultValue={textValue(item?.numberOfPax)} />
    <TextField name="adults" label="Adults" type="number" min="0" step="1" defaultValue={textValue(item?.adults)} /><TextField name="children" label="Children" type="number" min="0" step="1" defaultValue={textValue(item?.children)} /><TextField name="destination" label="Destination" defaultValue={textValue(item?.destination)} />
    <TextField name="duration" label="Duration" defaultValue={textValue(item?.duration)} /><TextField name="travelType" label="Travel Type" list="travel-type-options" defaultValue={textValue(item?.travelType)} /><TextField name="hotel" label="Hotel" defaultValue={textValue(item?.hotel)} />
    <TextField name="category" label="Hotel Category" list="hotel-category-options" defaultValue={textValue(item?.category)} /><TextField name="meal" label="Meal Preference" list="meal-preference-options" defaultValue={textValue(item?.meal)} /><TextField name="budgetUsd" label="Budget (USD)" type="number" min="0" step="0.01" defaultValue={textValue(item?.budgetUsd)} />
    <TextField name="leadStatus" label="Lead Status" list="lead-status-options" defaultValue={textValue(item?.leadStatus)} /><TextField name="dateConfirmation" label="Date Confirmation" type="date" defaultValue={dateValue(item?.dateConfirmation)} /><TextField name="leadQuality" label="Lead Quality" list="lead-quality-options" defaultValue={textValue(item?.leadQuality)} />{(!restricted || readable.has("assignedToId")) && <div className={fieldClass}><Label htmlFor="lead-assignedToId">Assigned To</Label><select id="lead-assignedToId" name="assignedToId" defaultValue={item?.assignedToId ?? ""} disabled={restricted && !writable.has("assignedToId")} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="">Chưa phân công</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>{restricted && !writable.has("assignedToId") && <input type="hidden" name="assignedToId" value={item?.assignedToId ?? ""} />}</div>}
    <TextField name="lastContact" label="Last Contact" type="date" defaultValue={dateValue(item?.lastContact)} /><TextField name="nextFollowUp" label="Next Follow-up" type="date" defaultValue={dateValue(item?.nextFollowUp)} /><TextField name="quotationNo" label="Quotation No." defaultValue={textValue(item?.quotationNo)} />
    <TextField name="quotationValueUsd" label="Quotation Value (USD)" type="number" min="0" step="0.01" defaultValue={textValue(item?.quotationValueUsd)} /><TextField name="followUpStatus" label="Follow-up Status" list="follow-up-status-options" defaultValue={textValue(item?.followUpStatus)} /><TextField name="bookingStatus" label="Booking Status" list="booking-status-options" defaultValue={textValue(item?.bookingStatus)} />
    <TextField name="bookingValueUsd" label="Booking Value (USD)" type="number" min="0" step="0.01" defaultValue={textValue(item?.bookingValueUsd)} /><TextField name="paymentStatus" label="Payment Status" list="payment-status-options" defaultValue={textValue(item?.paymentStatus)} /><TextField name="lostReason" label="Lost Reason" list="lost-reason-options" defaultValue={textValue(item?.lostReason)} />
    {(!restricted || readable.has("preference")) && <div className="space-y-1.5 md:col-span-2 xl:col-span-3"><Label htmlFor="lead-preference">Preference</Label><Textarea id="lead-preference" name="preference" defaultValue={item?.preference ?? ""} readOnly={restricted && !writable.has("preference")} /></div>}
    {(!restricted || readable.has("specialRequest")) && <div className="space-y-1.5 md:col-span-2 xl:col-span-3"><Label htmlFor="lead-specialRequest">Special Request</Label><Textarea id="lead-specialRequest" name="specialRequest" defaultValue={item?.specialRequest ?? ""} readOnly={restricted && !writable.has("specialRequest")} /></div>}
    {(!restricted || readable.has("remarks")) && <div className="space-y-1.5 md:col-span-2 xl:col-span-3"><Label htmlFor="lead-remarks">Remarks</Label><Textarea id="lead-remarks" name="remarks" defaultValue={item?.remarks ?? ""} readOnly={restricted && !writable.has("remarks")} /></div>}
    <Suggestions id="lead-source-options" items={leadSources} /><Suggestions id="channel-options" items={channels} /><Suggestions id="country-options" items={countries} /><Suggestions id="travel-type-options" items={travelTypes} /><Suggestions id="lead-status-options" items={leadStatuses} /><Suggestions id="lead-quality-options" items={leadQualities} /><Suggestions id="preferred-contact-options" items={preferredContacts} /><Suggestions id="hotel-category-options" items={hotelCategories} /><Suggestions id="booking-status-options" items={bookingStatuses} /><Suggestions id="payment-status-options" items={paymentStatuses} /><Suggestions id="follow-up-status-options" items={followUpStatuses} /><Suggestions id="lost-reason-options" items={lostReasons} /><Suggestions id="meal-preference-options" items={mealPreferences} />
    <Button type="submit" className="justify-self-start">{item ? "Lưu thay đổi" : "Lưu Lead"}</Button>
  </WorkCaseActionForm>;
}
