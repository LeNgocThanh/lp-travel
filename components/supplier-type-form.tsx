import type { SupplierType } from "@prisma/client";
import { MetadataFields } from "@/components/metadata-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

export function SupplierTypeForm({ action, item, prefix }: { action: (formData: FormData) => void | Promise<void>; item?: SupplierType; prefix: string }) {
  return <WorkCaseActionForm action={action} className="grid gap-3 md:grid-cols-2"><div><Label htmlFor={`${prefix}-code`}>Mã loại</Label><Input id={`${prefix}-code`} name="code" defaultValue={item?.code} minLength={2} maxLength={30} pattern="[A-Za-z0-9_-]+" required /></div><div><Label htmlFor={`${prefix}-name`}>Tên loại nhà cung cấp</Label><Input id={`${prefix}-name`} name="name" defaultValue={item?.name} minLength={2} maxLength={100} required /></div><div className="md:col-span-2"><Label htmlFor={`${prefix}-description`}>Mô tả</Label><Textarea id={`${prefix}-description`} name="description" defaultValue={item?.description ?? ""} maxLength={1000} /></div><MetadataFields metadata={item?.metadata} prefix={prefix} /><Button type="submit" className="justify-self-start">{item ? "Lưu thay đổi" : "Tạo loại"}</Button></WorkCaseActionForm>;
}
