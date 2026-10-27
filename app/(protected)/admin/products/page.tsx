import Link from "next/link";
import { Archive, ArchiveRestore, CalendarDays, Package, Search } from "lucide-react";
import { createProduct, setProductActive, updateProduct } from "@/app/actions/travel-master-data";
import { PartyDialog } from "@/components/party-dialog";
import { ProductForm } from "@/components/product-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requireAdmin();
  const { q = "", type = "" } = await searchParams;
  const query = q.trim();

  const [products, total, typeRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { code: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.product.count(),
    prisma.product.findMany({ distinct: ["type"], select: { type: true }, orderBy: { type: "asc" } }),
  ]);
  const types = typeRows.map((row) => row.type);

  // Link giữ lại ô tìm kiếm khi đổi bộ lọc loại
  const typeHref = (value: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value) params.set("type", value);
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };
  const filtered = Boolean(query || type);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tour và dịch vụ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Danh mục sản phẩm; chưa lưu giá hoặc booking.</p>
        </div>

        <PartyDialog
          mode="create"
          title="Tạo tour / dịch vụ"
          description="Nhập thông tin sản phẩm mới."
          version={total}
        >
          <ProductForm action={createProduct} prefix="new-product" />
        </PartyDialog>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Tìm theo tên, mã, mô tả..."
                className="pl-9"
              />
              {type && <input type="hidden" name="type" value={type} />}
            </form>
            <p className="text-sm text-muted-foreground">
              {filtered ? `${products.length} / ${total}` : total} sản phẩm
              {filtered && (
                <Link href="/admin/products" className="ml-2 text-sky-700 underline">
                  Xóa bộ lọc
                </Link>
              )}
            </p>
          </div>

          {types.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {["", ...types].map((value) => {
                const active = value === type;
                return (
                  <Link
                    key={value || "all"}
                    href={typeHref(value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {value || "Tất cả"}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="pl-4">Sản phẩm</TableHead>
              <TableHead className="hidden sm:table-cell">Loại</TableHead>
              <TableHead className="hidden lg:table-cell">Mô tả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="pr-4 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className={cn(!product.active && "bg-slate-50/60")}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        product.active ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-400",
                      )}
                    >
                      <Package className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate font-medium", !product.active && "text-slate-500")}>
                        {product.name}
                      </p>
                      <code className="text-xs text-muted-foreground">{product.code}</code>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    {product.type}
                  </Badge>
                </TableCell>

                <TableCell className="hidden max-w-xs lg:table-cell">
                  {product.description ? (
                    <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      product.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }
                  >
                    {product.active ? "Hoạt động" : "Đã lưu trữ"}
                  </Badge>
                </TableCell>

                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1">
                    {product.type === "TOUR" && <Button nativeButton={false} render={<Link href={`/admin/products/${product.id}`} />} variant="ghost" size="sm"><CalendarDays /><span className="hidden lg:inline">Lịch trình</span></Button>}
                    <PartyDialog
                      mode="edit"
                      title={product.name}
                      description={`${product.code} · ${product.type} · ${
                        product.active ? "Đang hoạt động" : "Đã lưu trữ"
                      }`}
                      version={product.updatedAt.getTime()}
                    >
                      <ProductForm
                        action={updateProduct.bind(null, product.id)}
                        item={product}
                        prefix={product.id}
                      />
                    </PartyDialog>

                    <form action={setProductActive.bind(null, product.id, !product.active)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className={product.active ? "text-slate-600" : "text-emerald-700"}
                      >
                        {product.active ? <Archive /> : <ArchiveRestore />}
                        <span className="hidden lg:inline">{product.active ? "Lưu trữ" : "Kích hoạt"}</span>
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!products.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  {filtered
                    ? "Không tìm thấy sản phẩm phù hợp."
                    : 'Chưa có tour hoặc dịch vụ. Bấm "Tạo tour / dịch vụ" để bắt đầu.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
