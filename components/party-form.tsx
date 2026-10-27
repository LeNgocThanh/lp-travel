import type { Customer, Supplier, SupplierType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetadataFields } from "@/components/metadata-fields";
import { Textarea } from "@/components/ui/textarea";

export function PartyForm({ action, item, prefix, supplierTypes }: { action: (formData: FormData) => void | Promise<void>; item?: Customer | Supplier; prefix: string; supplierTypes?: Pick<SupplierType, "id" | "name" | "active">[] }) {
  const selectedSupplierTypeId = item && "supplierTypeId" in item ? item.supplierTypeId : "";
  return <form action={action} className="grid gap-3 md:grid-cols-2">
    <div><Label htmlFor={`${prefix}-code`}>Mã</Label><Input id={`${prefix}-code`} name="code" defaultValue={item?.code} minLength={2} maxLength={30} pattern="[A-Za-z0-9_-]+" required /></div>
    <div><Label htmlFor={`${prefix}-name`}>Tên</Label><Input id={`${prefix}-name`} name="name" defaultValue={item?.name} minLength={2} maxLength={150} required /></div>
    <div><Label htmlFor={`${prefix}-type`}>Loại</Label><select id={`${prefix}-type`} name="partyType" defaultValue={item?.partyType ?? "PERSON"} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="PERSON">Cá nhân</option><option value="ORGANIZATION">Doanh nghiệp</option></select></div>
    {supplierTypes && <div><Label htmlFor={`${prefix}-supplier-type`}>Loại nhà cung cấp</Label><select id={`${prefix}-supplier-type`} name="supplierTypeId" defaultValue={selectedSupplierTypeId ?? ""} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Chưa phân loại</option>{supplierTypes.filter((type) => type.active || type.id === selectedSupplierTypeId).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>}
    <div><Label htmlFor={`${prefix}-phone`}>Số điện thoại</Label><Input id={`${prefix}-phone`} name="phone" type="tel" maxLength={30} defaultValue={item?.phone ?? ""} /></div>
    <div><Label htmlFor={`${prefix}-email`}>Email</Label><Input id={`${prefix}-email`} name="email" type="email" defaultValue={item?.email ?? ""} /></div>
    <div><Label htmlFor={`${prefix}-tax`}>Mã số thuế (nếu có)</Label><Input id={`${prefix}-tax`} name="taxId" maxLength={30} defaultValue={item?.taxId ?? ""} /></div>
    <div className="md:col-span-2"><Label htmlFor={`${prefix}-notes`}>Ghi chú</Label><Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} defaultValue={item?.notes ?? ""} /></div>
    <MetadataFields metadata={item?.metadata} prefix={prefix} />
    <Button type="submit" className="justify-self-start">{item ? "Lưu thay đổi" : "Tạo mới"}</Button>
  </form>;
}
