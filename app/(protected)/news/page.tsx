import Link from "next/link";
import type { Prisma, PostStatus } from "@prisma/client";
import { ArrowRight, Building2, Globe, MessageSquare, Newspaper, Pin, Plus, Search } from "lucide-react";
import { createPost } from "@/app/actions/news";
import { FormDialog } from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { manageableNewsDepartmentIds, newsPostScope } from "@/lib/news-access";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const TZ = "Asia/Ho_Chi_Minh";

const statusMeta: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "border-amber-200 bg-amber-50 text-amber-700" },
  PUBLISHED: { label: "Đã đăng", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  ARCHIVED: { label: "Đã lưu trữ", className: "border-slate-200 bg-slate-100 text-slate-500" },
};

const statusFilters = [
  { key: "", label: "Tất cả" },
  { key: "PUBLISHED", label: "Đã đăng" },
  { key: "DRAFT", label: "Bản nháp" },
  { key: "ARCHIVED", label: "Đã lưu trữ" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
};

function timeAgo(date: Date) {
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return date.toLocaleDateString("vi-VN", { timeZone: TZ });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const chipClass = "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600";

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await requireUser();
  const { q = "", status: statusParam = "" } = await searchParams;
  const query = q.trim();
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(statusParam) ? (statusParam as PostStatus) : undefined;

  const manageableIds = await manageableNewsDepartmentIds(user);
  const canPost = user.role === "ADMIN" || (manageableIds?.length ?? 0) > 0;
  const scope = await newsPostScope(user);

  const and: Prisma.PostWhereInput[] = [scope];
  if (status) and.push({ status });
  if (query) {
    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { body: { contains: query, mode: "insensitive" } },
        { authorName: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  const [posts, departments, total] = await Promise.all([
    prisma.post.findMany({
      where: { AND: and },
      include: { audiences: { include: { department: true } }, _count: { select: { comments: true } } },
      orderBy: [{ pinnedAt: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.department.findMany({
      where: { active: true, ...(manageableIds ? { id: { in: manageableIds } } : {}) },
      orderBy: { name: "asc" },
    }),
    prisma.post.count({ where: scope }), // dùng làm "version" để dialog tự đóng sau khi đăng bài
  ]);

  const filtered = Boolean(query || status);
  const pinned = posts.filter((post) => post.pinnedAt);
  const others = posts.filter((post) => !post.pinnedAt);

  const filterHref = (key: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (key) params.set("status", key);
    const qs = params.toString();
    return qs ? `/news?${qs}` : "/news";
  };

  const renderPost = (post: (typeof posts)[number]) => {
    const date = post.publishedAt ?? post.createdAt;
    const deptNames = post.audiences.map((item) => item.department.name);
    const meta = statusMeta[post.status];

    return (
      <Card
        key={post.id}
        className={cn(
          "gap-3 p-5 transition-shadow hover:shadow-md",
          post.pinnedAt && "border-amber-200 bg-amber-50/30",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
            {initials(post.authorName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{post.authorName}</p>
            <p className="text-xs text-muted-foreground" title={date.toLocaleString("vi-VN", { timeZone: TZ })}>
              {timeAgo(date)}
            </p>
          </div>
          {post.pinnedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Pin className="size-3" />
              Đã ghim
            </span>
          )}
          {post.status !== "PUBLISHED" && (
            <Badge variant="outline" className={meta.className}>
              {meta.label}
            </Badge>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold leading-snug text-slate-900">
            <Link href={`/news/${post.id}`} className="transition-colors hover:text-sky-700">
              {post.title}
            </Link>
          </h2>
          <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{post.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {post.audienceType === "ALL" ? (
            <span className={chipClass}>
              <Globe className="size-3" />
              Toàn công ty
            </span>
          ) : (
            <>
              {deptNames.slice(0, 3).map((name) => (
                <span key={name} className={chipClass}>
                  <Building2 className="size-3" />
                  {name}
                </span>
              ))}
              {deptNames.length > 3 && <span className={chipClass}>+{deptNames.length - 3}</span>}
            </>
          )}

          <Link
            href={`/news/${post.id}`}
            className="ml-auto inline-flex items-center gap-3 text-xs text-muted-foreground transition-colors hover:text-sky-700"
          >
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" />
              {post._count.comments} bình luận
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-sky-700">
              Đọc tiếp
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bảng tin nội bộ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Thông báo toàn công ty và theo phòng ban.</p>
        </div>

        {canPost && (
          <FormDialog
            title="Soạn bài viết"
            description="Manager đăng cho phòng mình quản lý; Admin có thể đăng toàn công ty."
            version={total}
            triggerLabel="Soạn bài viết"
            triggerIcon={<Plus />}
            className="sm:max-w-2xl"
          >
            <WorkCaseActionForm action={createPost} className="group/form grid gap-4">
              <Field label="Tiêu đề">
                <Input name="title" placeholder="Tiêu đề bài viết" required minLength={2} maxLength={200} />
              </Field>
              <Field label="Nội dung">
                <Textarea
                  name="body"
                  placeholder="Nội dung bài viết"
                  required
                  minLength={2}
                  maxLength={20000}
                  className="min-h-40"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Đối tượng nhận">
                  <select
                    name="audienceType"
                    defaultValue={user.role === "ADMIN" ? "ALL" : "DEPARTMENTS"}
                    className={selectClass}
                  >
                    <option value="DEPARTMENTS">Theo phòng ban</option>
                    {user.role === "ADMIN" && <option value="ALL">Toàn công ty</option>}
                  </select>
                </Field>
                <Field label="Trạng thái">
                  <select name="status" defaultValue="PUBLISHED" className={selectClass}>
                    <option value="PUBLISHED">Đăng ngay</option>
                    <option value="DRAFT">Lưu nháp</option>
                  </select>
                </Field>
              </div>

              {/* Ẩn khi chọn "Toàn công ty" (CSS :has, không cần state) */}
              <div className="space-y-2 group-has-[option[value=ALL]:checked]/form:hidden">
                <p className="text-sm font-medium text-slate-700">Phòng ban nhận bài viết</p>
                {departments.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {departments.map((department) => (
                      <label
                        key={department.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:bg-slate-50 has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50"
                      >
                        <input
                          type="checkbox"
                          name="departmentId"
                          value={department.id}
                          className="size-4 accent-sky-600"
                        />
                        {department.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Bạn chưa quản lý phòng ban nào.</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit">Lưu bài viết</Button>
              </div>
            </WorkCaseActionForm>
          </FormDialog>
        )}
      </div>

      <div className="space-y-3">
        <form className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={query} placeholder="Tìm bài viết theo tiêu đề, nội dung, tác giả..." className="bg-white pl-9" />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        {canPost && (
          <div className="flex flex-wrap items-center gap-1.5">
            {statusFilters.map(({ key, label }) => (
              <Link
                key={key || "all"}
                href={filterHref(key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  (status ?? "") === key
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {posts.length ? (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <Pin className="size-3.5" />
                Đã ghim
              </h2>
              {pinned.map(renderPost)}
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-3">
              {pinned.length > 0 && (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mới nhất</h2>
              )}
              {others.map(renderPost)}
            </section>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white py-16 text-center">
          <Newspaper className="size-8 text-slate-300" />
          <p className="text-sm text-muted-foreground">
            {filtered ? "Không tìm thấy bài viết phù hợp." : "Chưa có bài viết nào."}
          </p>
          {filtered && (
            <Link href="/news" className="text-sm text-sky-700 underline">
              Xóa bộ lọc
            </Link>
          )}
        </div>
      )}
    </div>
  );
}