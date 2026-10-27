import type { SupplierAddress, SupplierPhone } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

export function SupplierAddressForm({ action, item }: { action: (formData: FormData) => void | Promise<void>; item?: SupplierAddress }) {
  return <WorkCaseActionForm action={action} className="grid gap-3"><div><Label>Nhãn địa chỉ</Label><Input name="label" defaultValue={item?.label ?? ""} maxLength={100} placeholder="Ví dụ: Văn phòng chính, Chi nhánh Hà Nội" /></div><div><Label>Địa chỉ</Label><Textarea name="address" defaultValue={item?.address ?? ""} minLength={3} maxLength={1000} required /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPrimary" defaultChecked={item?.isPrimary} /> Địa chỉ chính</label><Button type="submit" className="justify-self-start">{item ? "Lưu địa chỉ" : "Thêm địa chỉ"}</Button></WorkCaseActionForm>;
}

export function SupplierPhoneForm({ action, item }: { action: (formData: FormData) => void | Promise<void>; item?: SupplierPhone }) {
  return <WorkCaseActionForm action={action} className="grid gap-3"><div><Label>Nhãn số điện thoại</Label><Input name="label" defaultValue={item?.label ?? ""} maxLength={100} placeholder="Ví dụ: Hotline, Kế toán, Điều hành" /></div><div><Label>Số điện thoại</Label><Input name="phone" type="tel" defaultValue={item?.phone ?? ""} minLength={3} maxLength={30} required /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPrimary" defaultChecked={item?.isPrimary} /> Số điện thoại chính</label><Button type="submit" className="justify-self-start">{item ? "Lưu số điện thoại" : "Thêm số điện thoại"}</Button></WorkCaseActionForm>;
}
