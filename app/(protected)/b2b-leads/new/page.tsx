import Link from "next/link";
import { redirect } from "next/navigation";
import { createB2BLead } from "@/app/actions/b2b-leads";
import { LeadForm } from "@/components/lead-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { hasResourceAction } from "@/lib/lead-access";
import { getLeadFormOptions } from "@/lib/lead-form-options";

export default async function NewB2BLeadPage() {
  const user = await requireUser(); if (!(await hasResourceAction(user, "LEADS", "CREATE"))) redirect("/b2b-leads");
  const options = await getLeadFormOptions();
  return <div className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Tạo Lead B2B</h1><p className="text-sm text-muted-foreground">Lead Source mặc định là B2B và vẫn có thể nhập hoặc chọn từ dữ liệu nền.</p></div><Button nativeButton={false} render={<Link href="/b2b-leads" />} variant="outline">Danh sách Lead B2B</Button></div><Card><CardHeader><CardTitle>Thông tin Lead B2B</CardTitle><CardDescription>Dữ liệu được lưu độc lập với Lead B2C.</CardDescription></CardHeader><CardContent><LeadForm action={createB2BLead} defaultLeadSource="B2B" {...options} /></CardContent></Card></div>;
}
