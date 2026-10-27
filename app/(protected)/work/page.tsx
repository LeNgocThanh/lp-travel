import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workCaseScope } from "@/lib/work-case-access";

const statusLabel: Record<string, string> = { RECEIVED: "Tiếp nhận", CONSULTING: "Đang tư vấn", CONFIRMED: "Đã xác nhận", BOOKING: "Đang đặt dịch vụ", IN_PROGRESS: "Đang thực hiện", COMPLETED: "Hoàn tất", ON_HOLD: "Tạm dừng", CANCELLED: "Đã hủy" };

export default async function WorkCasesPage() {
  const user = await requireUser();
  const workCases = await prisma.workCase.findMany({ where: await workCaseScope(user), include: { department: true, receiver: true, _count: { select: { items: true, travelers: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return <Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Hồ sơ việc</CardTitle><CardDescription>Yêu cầu tour và đặt dịch vụ trong phạm vi bạn phụ trách.</CardDescription></div><Button nativeButton={false} render={<Link href="/work/new" />}>Tạo hồ sơ</Button></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Mã</TableHead><TableHead>Tiêu đề</TableHead><TableHead>Khách hàng</TableHead><TableHead>Phòng ban</TableHead><TableHead>Người tiếp nhận</TableHead><TableHead>Trạng thái</TableHead><TableHead>Nhu cầu</TableHead></TableRow></TableHeader><TableBody>{workCases.map((item) => <TableRow key={item.id}><TableCell><Link className="text-sky-700 underline" href={`/work/${item.id}`}>{item.code}</Link></TableCell><TableCell>{item.title}</TableCell><TableCell>{item.customerNameSnapshot}</TableCell><TableCell>{item.department.name}</TableCell><TableCell>{item.receiver.fullName}</TableCell><TableCell><Badge variant="secondary">{statusLabel[item.status]}</Badge></TableCell><TableCell>{item._count.items} · {item._count.travelers} khách đi</TableCell></TableRow>)}{!workCases.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Chưa có hồ sơ nào.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>;
}
