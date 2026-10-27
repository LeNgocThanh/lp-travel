import Link from "next/link";
import { DatabaseZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DocumentDataContractsPage() {
  await requireAdmin();
  const sources = await prisma.documentDataSource.findMany({ include: { _count: { select: { fields: true, datasets: true } } }, orderBy: { name: "asc" } });
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Data Contracts</h1><p className="text-sm text-muted-foreground">Quản lý mapping, phép tính và dataset giữa Source Adapter an toàn với Template Builder.</p></div><Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Source Adapter và truy vấn Prisma vẫn nằm trong code. Trang này chỉ cấu hình dữ liệu đầu ra bằng các phép xử lý được hệ thống cho phép; không nhập code, SQL hoặc JSON.</Card><div className="grid gap-4 lg:grid-cols-3">{sources.map((source) => <Card key={source.id} className="gap-4 p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold">{source.name}</h2><code className="text-xs text-muted-foreground">{source.code}</code></div><Badge>{source.documentType}</Badge></div><p className="text-sm text-muted-foreground">{source.description}</p><div className="text-sm"><p>Adapter code: <strong>{source.adapterCode}</strong></p><p>{source._count.fields} trường · {source._count.datasets} dataset</p></div><Button nativeButton={false} render={<Link href={`/admin/template-builder/data-contracts/${source.id}`} />}><DatabaseZap />Cấu hình</Button></Card>)}</div></div>;
}
