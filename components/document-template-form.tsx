import type { DocumentTemplate } from "@prisma/client";
import { MetadataFields } from "@/components/metadata-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function DocumentTemplateForm({ action, item, prefix }: { action: (formData: FormData) => void | Promise<void>; item?: DocumentTemplate; prefix: string }) {
  return <WorkCaseActionForm action={action} className="grid gap-3 md:grid-cols-2">
    <div><Label htmlFor={`${prefix}-code`}>Mã mẫu</Label><Input id={`${prefix}-code`} name="code" defaultValue={item?.code} minLength={2} maxLength={50} pattern="[A-Za-z0-9_-]+" required /></div>
    <div><Label htmlFor={`${prefix}-name`}>Tên mẫu</Label><Input id={`${prefix}-name`} name="name" defaultValue={item?.name} minLength={2} maxLength={150} required /></div>
    <div><Label htmlFor={`${prefix}-type`}>Loại mẫu</Label><select id={`${prefix}-type`} name="type" defaultValue={item?.type ?? "HEADER"} className={selectClass}><option value="HEADER">Header</option><option value="FOOTER">Footer</option><option value="CONTENT">Nội dung khác</option></select></div>
    <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={item?.isDefault} /> Dùng làm mẫu mặc định của loại này</label>
    <div className="md:col-span-2"><Label htmlFor={`${prefix}-description`}>Mô tả</Label><Textarea id={`${prefix}-description`} name="description" defaultValue={item?.description ?? ""} maxLength={1000} rows={2} /></div>
    <div className="md:col-span-2"><Label htmlFor={`${prefix}-image`}>Ảnh Header/Footer</Label><Input id={`${prefix}-image`} name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /><p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, WEBP hoặc GIF, tối đa 10 MB. Ảnh được lưu tại Travel/Templates trên uploader.</p></div>
    {item?.imageStoredName && <div className="space-y-2 md:col-span-2"><p className="text-sm font-medium">Ảnh hiện tại</p>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/template-assets/${item.id}`} alt={item.imageAlt ?? item.name} className="max-h-48 max-w-full rounded-md border object-contain" /><label className="flex items-center gap-2 text-sm text-destructive"><input type="checkbox" name="removeImage" />Gỡ ảnh khỏi mẫu khi lưu</label></div>}
    <div className="md:col-span-2"><Label htmlFor={`${prefix}-image-alt`}>Mô tả ảnh</Label><Input id={`${prefix}-image-alt`} name="imageAlt" defaultValue={item?.imageAlt ?? ""} maxLength={300} placeholder="Ví dụ: Header La Passion Travel" /></div>
    <div className="md:col-span-2"><Label htmlFor={`${prefix}-content`}>Nội dung chữ</Label><Textarea id={`${prefix}-content`} name="content" defaultValue={item?.content ?? ""} maxLength={100000} rows={12} /><p className="mt-1 text-xs text-muted-foreground">Mẫu cần có ít nhất nội dung chữ hoặc ảnh. Có thể dùng placeholder như {"{{companyName}}"}.</p></div>
    <MetadataFields metadata={item?.metadata} prefix={prefix} />
    <Button type="submit" className="justify-self-start">{item ? "Lưu thay đổi" : "Tạo mẫu"}</Button>
  </WorkCaseActionForm>;
}
