import Link from "next/link";
import { ArrowLeft, Eye, FilePlus2, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

export default async function TourGuideContractsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(); const { id } = await params;
  const item = await prisma.quickItinerary.findUnique({ where: { id }, select: { id: true, title: true, leadId: true, b2bLeadId: true, days: { orderBy: { dayNumber: "asc" }, select: { tourGuides: { where: { tourGuideId: { not: null } }, select: { tourGuideId: true, tourGuideName: true, tourGuideIdentity: true } } } }, guideContracts: { select: { id: true, tourGuideId: true, contractNumber: true, guideName: true, workingDayCount: true, updatedAt: true } } } });
  if (!item || (!item.leadId && !item.b2bLeadId) || !await hasResourceAction(actor, "LEADS", "READ")) notFound();
  const canEdit = await hasResourceAction(actor, "LEADS", "UPDATE");
  const guideMap = new Map<string, { id: string; name: string; identity: string }>();
  for (const day of item.days) for (const guide of day.tourGuides) if (guide.tourGuideId) guideMap.set(guide.tourGuideId, { id: guide.tourGuideId, name: guide.tourGuideName, identity: guide.tourGuideIdentity });
  const contractMap = new Map(item.guideContracts.map((contract) => [contract.tourGuideId, contract]));
  return <div className="space-y-6"><Link href={`/quick/${item.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Quay lại lịch trình</Link><div><h1 className="text-2xl font-semibold">Hợp đồng hướng dẫn viên</h1><p className="text-sm text-muted-foreground">{item.title} · mỗi hướng dẫn viên có một hợp đồng cho các ngày được phân công.</p></div><div className="grid gap-4">{[...guideMap.values()].map((guide) => { const contract = contractMap.get(guide.id); return <Card key={guide.id}><CardHeader><CardTitle className="text-base">{guide.name} · {guide.identity}</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{contract ? `Hợp đồng ${contract.contractNumber} · ${contract.workingDayCount} ngày công` : "Chưa có hợp đồng"}</p>{contract ? <div className="flex gap-2"><Button nativeButton={false} variant="outline" render={<Link href={`/quick/${item.id}/guide-contracts/${contract.id}`} />}><Eye />Xem</Button>{canEdit && <Button nativeButton={false} render={<Link href={`/quick/${item.id}/guide-contracts/${contract.id}?edit=1`} />}><Pencil />Sửa</Button>}</div> : canEdit && <Button nativeButton={false} render={<Link href={`/quick/${item.id}/guide-contracts/new?guideId=${guide.id}`} />}><FilePlus2 />Tạo hợp đồng</Button>}</CardContent></Card>; })}{guideMap.size === 0 && <Card className="p-5 text-sm text-muted-foreground">Chưa có hướng dẫn viên cụ thể được chọn trong lịch trình. Các ngày chỉ tick “Hướng dẫn viên” nhưng chưa chọn người sẽ chưa thể tạo hợp đồng.</Card>}</div></div>;
}
