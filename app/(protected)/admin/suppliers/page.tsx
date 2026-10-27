import Link from "next/link";
import { Archive, ArchiveRestore, Building2, MapPin, Search, User } from "lucide-react";
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

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [suppliers, total, supplierTypes] = await Promise.all([
    prisma.supplier.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              { supplierType: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {},
      orderBy: { name: "asc" },
      include: { supplierType: true },
    }),
    prisma.supplier.count(),
    prisma.supplierType.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nhà cung cấp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cá nhân hoặc doanh nghiệp cung ứng tour và dịch vụ. Giá mua sẽ quản lý ở giai đoạn sau.
          </p>
        </div>

        <PartyDialog
          mode="create"
          title="Tạo nhà cung cấp"
          description="Nhập thông tin nhà cung cấp mới."
          version={total}
        >
          <PartyForm action={createParty.bind(null, "supplier")} prefix="new-supplier" supplierTypes={supplierTypes} />
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
            {query ? `${suppliers.length} / ${total}` : total} nhà cung cấp
            {query && (
              <Link href="/admin/suppliers" className="ml-2 text-sky-700 underline">
                Xóa tìm kiếm
              </Link>
            )}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="pl-4">Nhà cung cấp</TableHead>
              <TableHead className="hidden sm:table-cell">Loại</TableHead>
              <TableHead className="hidden lg:table-cell">Loại nhà cung cấp</TableHead>
              <TableHead className="hidden md:table-cell">Liên hệ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="pr-4 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {suppliers.map((supplier) => {
              const isPerson = supplier.partyType === "PERSON";
              const Icon = isPerson ? User : Building2;
              return (
                <TableRow key={supplier.id} className={cn(!supplier.active && "bg-slate-50/60")}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          supplier.active ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={cn("truncate font-medium", !supplier.active && "text-slate-500")}>
                          {supplier.name}
                        </p>
                        <code className="text-xs text-muted-foreground">{supplier.code}</code>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden text-sm text-slate-600 sm:table-cell">
                    {isPerson ? "Cá nhân" : "Doanh nghiệp"}
                  </TableCell>

                  <TableCell className="hidden text-sm text-slate-600 lg:table-cell">
                    {supplier.supplierType?.name ?? "Chưa phân loại"}
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    {supplier.phone || supplier.email ? (
                      <div className="space-y-0.5 text-sm">
                        {supplier.phone && <p className="text-slate-700">{supplier.phone}</p>}
                        {supplier.email && <p className="text-xs text-muted-foreground">{supplier.email}</p>}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        supplier.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }
                    >
                      {supplier.active ? "Hoạt động" : "Đã lưu trữ"}
                    </Badge>
                  </TableCell>

                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button nativeButton={false} render={<Link href={`/admin/suppliers/${supplier.id}`} />} variant="ghost" size="sm"><MapPin /><span className="hidden lg:inline">Địa chỉ & SĐT</span></Button>
                      <PartyDialog
                        mode="edit"
                        title={supplier.name}
                        description={`${supplier.code} · ${isPerson ? "Cá nhân" : "Doanh nghiệp"} · ${
                          supplier.active ? "Đang hoạt động" : "Đã lưu trữ"
                        }`}
                        version={supplier.updatedAt.getTime()}
                      >
                        <PartyForm
                          action={updateParty.bind(null, "supplier", supplier.id)}
                          item={supplier}
                          prefix={supplier.id}
                          supplierTypes={supplierTypes}
                        />
                      </PartyDialog>

                      <form action={setPartyActive.bind(null, "supplier", supplier.id, !supplier.active)}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className={supplier.active ? "text-slate-600" : "text-emerald-700"}
                        >
                          {supplier.active ? <Archive /> : <ArchiveRestore />}
                          <span className="hidden lg:inline">{supplier.active ? "Lưu trữ" : "Kích hoạt"}</span>
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {!suppliers.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  {query
                    ? "Không tìm thấy nhà cung cấp phù hợp."
                    : 'Chưa có nhà cung cấp. Bấm "Tạo nhà cung cấp" để bắt đầu.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
