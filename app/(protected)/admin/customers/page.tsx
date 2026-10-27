import Link from "next/link";
import { Archive, ArchiveRestore, Building2, Search, User } from "lucide-react";
import { createParty, setPartyActive, updateParty } from "@/app/actions/travel-master-data";
import { PartyDialog } from "@/components/party-dialog";
import { PartyForm } from "@/components/party-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
            ],
          }
        : {},
      orderBy: { name: "asc" },
    }),
    prisma.customer.count(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Khách hàng</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cá nhân hoặc doanh nghiệp đứng tên yêu cầu. Chưa lưu thông tin hành khách tại đây.
          </p>
        </div>

        <PartyDialog
          mode="create"
          title="Tạo khách hàng"
          description="Nhập thông tin khách hàng mới."
          version={total}
        >
          <PartyForm action={createParty.bind(null, "customer")} prefix="new-customer" />
        </PartyDialog>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <form className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Tìm theo tên, mã, SĐT, email..."
              className="pl-9"
            />
          </form>
          <p className="text-sm text-muted-foreground">
            {query ? `${customers.length} / ${total}` : total} khách hàng
            {query && (
              <Link href="/admin/customers" className="ml-2 text-sky-700 underline">
                Xóa tìm kiếm
              </Link>
            )}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="pl-4">Khách hàng</TableHead>
              <TableHead className="hidden sm:table-cell">Loại</TableHead>
              <TableHead className="hidden md:table-cell">Liên hệ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="pr-4 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {customers.map((customer) => {
              const isPerson = customer.partyType === "PERSON";
              const Icon = isPerson ? User : Building2;
              return (
                <TableRow key={customer.id} className={cn(!customer.active && "bg-slate-50/60")}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          customer.active ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={cn("truncate font-medium", !customer.active && "text-slate-500")}><Link href={`/customers/${customer.id}`} className="hover:underline">{customer.name}</Link></p>
                        <code className="text-xs text-muted-foreground">{customer.code}</code>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden text-sm text-slate-600 sm:table-cell">
                    {isPerson ? "Cá nhân" : "Doanh nghiệp"}
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    {customer.phone || customer.email ? (
                      <div className="space-y-0.5 text-sm">
                        {customer.phone && <p className="text-slate-700">{customer.phone}</p>}
                        {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        customer.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }
                    >
                      {customer.active ? "Hoạt động" : "Đã lưu trữ"}
                    </Badge>
                  </TableCell>

                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <PartyDialog
                        mode="edit"
                        title={customer.name}
                        description={`${customer.code} · ${isPerson ? "Cá nhân" : "Doanh nghiệp"} · ${
                          customer.active ? "Đang hoạt động" : "Đã lưu trữ"
                        }`}
                        version={customer.updatedAt.getTime()}
                      >
                        <PartyForm
                          action={updateParty.bind(null, "customer", customer.id)}
                          item={customer}
                          prefix={customer.id}
                        />
                      </PartyDialog>

                      <form action={setPartyActive.bind(null, "customer", customer.id, !customer.active)}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className={customer.active ? "text-slate-600" : "text-emerald-700"}
                        >
                          {customer.active ? <Archive /> : <ArchiveRestore />}
                          <span className="hidden lg:inline">{customer.active ? "Lưu trữ" : "Kích hoạt"}</span>
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {!customers.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  {query
                    ? "Không tìm thấy khách hàng phù hợp."
                    : 'Chưa có khách hàng. Bấm "Tạo khách hàng" để bắt đầu.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
