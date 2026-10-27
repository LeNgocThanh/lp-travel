import type { Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetadataFields } from "@/components/metadata-fields";
import { Textarea } from "@/components/ui/textarea";

export function ProductForm({ action, item, prefix }: { action: (formData: FormData) => void | Promise<void>; item?: Product; prefix: string }) {
  return <form action={action} className="grid gap-3 md:grid-cols-2">
    <div><Label htmlFor={`${prefix}-code`}>Mã</Label><Input id={`${prefix}-code`} name="code" defaultValue={item?.code} minLength={2} maxLength={30} pattern="[A-Za-z0-9_-]+" required /></div>
    <div><Label htmlFor={`${prefix}-name`}>Tên tour/dịch vụ</Label><Input id={`${prefix}-name`} name="name" defaultValue={item?.name} minLength={2} maxLength={150} required /></div>
    <div><Label htmlFor={`${prefix}-type`}>Loại</Label><Input id={`${prefix}-type`} name="type" list={`${prefix}-types`} defaultValue={item?.type ?? "TOUR"} minLength={2} maxLength={30} pattern="[A-Za-z0-9_-]+" required /><datalist id={`${prefix}-types`}><option value="TOUR" /><option value="SERVICE" /></datalist></div>
    <div className="md:col-span-2"><Label htmlFor={`${prefix}-description`}>Mô tả</Label><Textarea id={`${prefix}-description`} name="description" maxLength={2000} defaultValue={item?.description ?? ""} /></div>
    <MetadataFields metadata={item?.metadata} prefix={prefix} />
    <Button type="submit" className="justify-self-start">{item ? "Lưu thay đổi" : "Tạo mới"}</Button>
  </form>;
}
