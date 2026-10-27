import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  FileText,
  History,
  Info as InfoIcon,
  Package,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  addWorkCaseContact,
  addWorkCaseItem,
  addWorkCaseTraveler,
  changeWorkCaseStatus,
  deleteWorkCaseContact,
  deleteWorkCaseItem,
  deleteWorkCaseTraveler,
  updateWorkCaseContact,
  updateWorkCaseDetails,
  updateWorkCaseItem,
  updateWorkCaseTraveler,
} from "@/app/actions/work-cases";
import { changeBookingStatus, createBooking, createWorkTask } from "@/app/actions/bookings-tasks";
import { FormDialog } from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { WorkTaskPanel } from "@/components/work-task-panel";
import { requireUser } from "@/lib/auth";
import { hasDepartmentPermission } from "@/lib/department-permissions";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { workCaseScope } from "@/lib/work-case-access";

const TZ = "Asia/Ho_Chi_Minh";

const statusLabel: Record<string, string> = { RECEIVED: "Tiếp nhận", CONSULTING: "Đang tư vấn", CONFIRMED: "Đã xác nhận", BOOKING: "Đang đặt dịch vụ", IN_PROGRESS: "Đang thực hiện", COMPLETED: "Hoàn tất", ON_HOLD: "Tạm dừng", CANCELLED: "Đã hủy" };
const bookingStatusLabel: Record<string, string> = { REQUESTED: "Đã yêu cầu", ON_HOLD: "Giữ chỗ", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã hủy" };
const nextStatuses: Record<string, string[]> = { RECEIVED: ["CONSULTING", "ON_HOLD", "CANCELLED"], CONSULTING: ["CONFIRMED", "ON_HOLD", "CANCELLED"], CONFIRMED: ["BOOKING", "ON_HOLD", "CANCELLED"], BOOKING: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "ON_HOLD", "CANCELLED"], ON_HOLD: ["CONSULTING", "CONFIRMED", "BOOKING", "IN_PROGRESS", "CANCELLED"] };
const flow = ["RECEIVED", "CONSULTING", "CONFIRMED", "BOOKING", "IN_PROGRESS", "COMPLETED"];

const statusBadge: Record<string, string> = {
  RECEIVED: "border-slate-200 bg-slate-100 text-slate-700",
  CONSULTING: "border-sky-200 bg-sky-50 text-sky-700",
  CONFIRMED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  BOOKING: "border-violet-200 bg-violet-50 text-violet-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ON_HOLD: "border-amber-200 bg-amber-50 text-amber-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};
const bookingStatusBadge: Record<string, string> = {
  REQUESTED: "border-sky-200 bg-sky-50 text-sky-700",
  ON_HOLD: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
};
const priorityMeta: Record<string, { label: string; className: string }> = {
  LOW: { label: "Thấp", className: "border-slate-200 bg-slate-50 text-slate-600" },
  NORMAL: { label: "Bình thường", className: "border-sky-200 bg-sky-50 text-sky-700" },
  HIGH: { label: "Cao", className: "border-amber-200 bg-amber-50 text-amber-700" },
  URGENT: { label: "Khẩn cấp", className: "border-red-200 bg-red-50 text-red-700" },
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
const smallSelectClass =
  "h-8 rounded-md border border-input bg-white px-2 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("vi-VN", { timeZone: TZ }) : "—");
const fmtDateTime = (d: Date) => d.toLocaleString("vi-VN", { timeZone: TZ });
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
};

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Info({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-slate-900">{children}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>
);

const Avatar = ({ name, className }: { name: string; className?: string }) => (
  <span
    className={cn(
      "flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700",
      className,
    )}
  >
    {initials(name)}
  </span>
);

export default async function WorkCasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await prisma.workCase.findFirst({
    where: { id, ...(await workCaseScope(user)) },
    include: {
      department: true,
      receiver: true,
      itinerary: { select: { id: true } },
      items: true,
      contacts: true,
      travelers: true,
      bookings: { include: { workCaseItem: true }, orderBy: { createdAt: "desc" } },
      tasks: { include: { assignments: { include: { user: true } }, comments: { orderBy: { createdAt: "asc" } }, checklist: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } }, orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!item) notFound();

  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 500 });
  const [suppliers, departmentUsers] = await Promise.all([
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.user.findMany({
      where: { active: true, memberships: { some: { departmentId: item.departmentId } } },
      orderBy: { fullName: "asc" },
    }),
  ]);
  const canCancelTasks =
    user.role === "ADMIN" ||
    item.receiverId === user.id ||
    (await hasDepartmentPermission(user, item.departmentId, "canAssignTasks"));

  // Dialog tự đóng khi dữ liệu hồ sơ đổi (sau khi lưu thành công)
  const pageVersion = [
    item.updatedAt.getTime(),
    item.activities[0]?.id ?? "",
    item.items.length,
    item.contacts.length,
    item.travelers.length,
    item.bookings.length,
    item.tasks.length,
  ].join(":");
  const sig = (...parts: unknown[]) => [pageVersion, ...parts].join("|");

  const priority = priorityMeta[item.priority] ?? priorityMeta.NORMAL;
  const flowIndex = flow.indexOf(item.status);
  const next = nextStatuses[item.status] ?? [];

  const productSelect = (name: string, defaultValue: string | null, emptyLabel: string) => (
    <select name={name} defaultValue={defaultValue ?? ""} className={selectClass}>
      <option value="">{emptyLabel}</option>
      {products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      <Link
        href="/work"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Hồ sơ việc
      </Link>

      {/* ===== Header hồ sơ ===== */}
      <Card className="gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{item.code}</code>
              <Badge variant="outline" className={statusBadge[item.status]}>
                {statusLabel[item.status]}
              </Badge>
              <Badge variant="outline" className={priority.className}>
                Ưu tiên: {priority.label}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href={`/work/${item.id}/itinerary`} />}>
              <FileText />
              {item.itinerary ? "Xem itinerary" : "Tạo itinerary"}
            </Button>
            <FormDialog
              title="Sửa hồ sơ"
              description={item.code}
              version={sig("details")}
              triggerLabel="Sửa hồ sơ"
              triggerIcon={<Pencil />}
              triggerVariant="outline"
              className="sm:max-w-xl"
            >
              <WorkCaseActionForm action={updateWorkCaseDetails.bind(null, item.id)} className="grid gap-3 sm:grid-cols-2">
                <Field label="Tiêu đề" className="sm:col-span-2">
                  <Input name="title" defaultValue={item.title} required />
                </Field>
                <Field label="Ưu tiên">
                  <select name="priority" defaultValue={item.priority} className={selectClass}>
                    <option value="LOW">Thấp</option>
                    <option value="NORMAL">Bình thường</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </Field>
                <Field label="Ngày dự kiến">
                  <Input name="expectedAt" type="date" defaultValue={item.expectedAt?.toISOString().slice(0, 10)} />
                </Field>
                <Field label="Mô tả" className="sm:col-span-2">
                  <Textarea name="description" defaultValue={item.description ?? ""} rows={4} />
                </Field>
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit">Lưu thông tin</Button>
                </div>
              </WorkCaseActionForm>
            </FormDialog>

            {next.length > 0 && (
              <FormDialog
                title="Chuyển trạng thái"
                description={`Hiện tại: ${statusLabel[item.status]}`}
                version={sig("status", item.status)}
                triggerLabel="Chuyển trạng thái"
                triggerIcon={<Check />}
              >
                <WorkCaseActionForm action={changeWorkCaseStatus.bind(null, item.id)} className="space-y-4">
                  <Field label="Trạng thái mới">
                    <select name="status" className={selectClass}>
                      {next.map((value) => (
                        <option key={value} value={value}>
                          {statusLabel[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex justify-end">
                    <Button type="submit">Cập nhật trạng thái</Button>
                  </div>
                </WorkCaseActionForm>
              </FormDialog>
            )}
          </div>
        </div>

        {/* Thanh tiến trình */}
        {flowIndex >= 0 ? (
          <div className="overflow-x-auto pb-1">
            <ol className="flex min-w-[40rem] items-center">
              {flow.map((step, i) => {
                const done = i < flowIndex;
                const current = i === flowIndex;
                return (
                  <li key={step} className={cn("flex items-center gap-2", i < flow.length - 1 && "flex-1")}>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        done && "bg-emerald-500 text-white",
                        current && "bg-sky-600 text-white ring-4 ring-sky-100",
                        !done && !current && "bg-slate-100 text-slate-400",
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap text-xs font-medium",
                        current ? "text-sky-700" : done ? "text-slate-700" : "text-slate-400",
                      )}
                    >
                      {statusLabel[step]}
                    </span>
                    {i < flow.length - 1 && (
                      <span className={cn("mx-2 h-0.5 min-w-4 flex-1", done ? "bg-emerald-400" : "bg-slate-200")} />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", statusBadge[item.status])}>
            <InfoIcon className="size-4 shrink-0" />
            {item.status === "ON_HOLD" ? "Hồ sơ đang tạm dừng." : "Hồ sơ đã bị hủy."}
          </div>
        )}

        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info icon={User} label="Khách hàng chính">
            {item.customerNameSnapshot}
            {item.customerPhoneSnapshot && (
              <span className="font-normal text-muted-foreground"> · {item.customerPhoneSnapshot}</span>
            )}
          </Info>
          <Info icon={CalendarDays} label="Ngày dự kiến">
            {item.expectedAt ? fmtDate(item.expectedAt) : "Chưa có"}
          </Info>
          <Info icon={Building2} label="Phòng ban">
            {item.department.name}
          </Info>
          <Info icon={UserCheck} label="Người tiếp nhận">
            {item.receiver.fullName}
          </Info>
          <Info icon={Pencil} label="Người tạo">
            {item.createdByName}
          </Info>
        </div>

        {item.description && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Mô tả</p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>
          </div>
        )}
      </Card>

      {/* ===== Tabs ===== */}
      <Tabs defaultValue="needs" className="gap-4">
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="needs">Nhu cầu ({item.items.length})</TabsTrigger>
            <TabsTrigger value="people">
              Liên hệ & người đi tour ({item.contacts.length + item.travelers.length})
            </TabsTrigger>
            <TabsTrigger value="bookings">Đặt dịch vụ ({item.bookings.length})</TabsTrigger>
            <TabsTrigger value="tasks">Giao việc ({item.tasks.length})</TabsTrigger>
            <TabsTrigger value="activity">Hoạt động</TabsTrigger>
          </TabsList>
        </div>

        {/* --- Nhu cầu --- */}
        <TabsContent value="needs">
          <Section
            title="Nhu cầu"
            action={
              <FormDialog
                title="Thêm nhu cầu"
                version={sig("add-item")}
                triggerLabel="Thêm nhu cầu"
                triggerIcon={<Plus />}
                triggerSize="sm"
              >
                <WorkCaseActionForm action={addWorkCaseItem.bind(null, item.id)} className="grid gap-3 sm:grid-cols-2">
                  <Field label="Chọn từ danh mục" className="sm:col-span-2">
                    {productSelect("productId", null, "Nhập tay")}
                  </Field>
                  <Field label="Tên nhu cầu">
                    <Input name="name" placeholder="Tên nhu cầu" />
                  </Field>
                  <Field label="Loại">
                    <Input name="type" defaultValue="SERVICE" />
                  </Field>
                  <Field label="Số lượng">
                    <Input name="quantity" type="number" min={1} defaultValue={1} />
                  </Field>
                  <Field label="Mô tả">
                    <Input name="description" placeholder="Mô tả" />
                  </Field>
                  <div className="flex justify-end sm:col-span-2">
                    <Button type="submit">Thêm nhu cầu</Button>
                  </div>
                </WorkCaseActionForm>
              </FormDialog>
            }
          >
            {item.items.length ? (
              <ul className="divide-y">
                {item.items.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      <Package className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{line.productNameSnapshot}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {line.description || (line.productId ? "Từ danh mục" : "Nhập tay")}
                      </p>
                    </div>
                    <Badge variant="outline" className="hidden border-slate-200 bg-slate-50 text-slate-700 sm:inline-flex">
                      {line.productTypeSnapshot}
                    </Badge>
                    <span className="w-10 text-right text-sm text-slate-600">×{line.quantity}</span>
                    <FormDialog
                      title="Sửa nhu cầu"
                      description={line.productNameSnapshot}
                      version={sig(line.id, line.productId, line.productNameSnapshot, line.productTypeSnapshot, line.quantity, line.description)}
                      triggerLabel="Sửa"
                      triggerIcon={<Pencil />}
                      triggerVariant="ghost"
                      triggerSize="sm"
                    >
                      <WorkCaseActionForm
                        action={updateWorkCaseItem.bind(null, item.id, line.id)}
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <Field label="Chọn từ danh mục" className="sm:col-span-2">
                          {productSelect("productId", line.productId, "Dữ liệu nhập tay")}
                        </Field>
                        <Field label="Tên nhu cầu">
                          <Input name="name" defaultValue={line.productNameSnapshot} />
                        </Field>
                        <Field label="Loại">
                          <Input name="type" defaultValue={line.productTypeSnapshot} />
                        </Field>
                        <Field label="Số lượng">
                          <Input name="quantity" type="number" min={1} defaultValue={line.quantity} />
                        </Field>
                        <Field label="Mô tả">
                          <Input name="description" defaultValue={line.description ?? ""} />
                        </Field>
                        <div className="flex justify-end sm:col-span-2">
                          <Button type="submit">Lưu thay đổi</Button>
                        </div>
                      </WorkCaseActionForm>
                      <WorkCaseActionForm action={deleteWorkCaseItem.bind(null, item.id, line.id)} className="border-t pt-3">
                        <Button type="submit" variant="destructive" size="sm">
                          <Trash2 />
                          Xóa nhu cầu
                        </Button>
                      </WorkCaseActionForm>
                    </FormDialog>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Chưa có nhu cầu nào." />
            )}
          </Section>
        </TabsContent>

        {/* --- Liên hệ & người đi tour --- */}
        <TabsContent value="people">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Người liên hệ"
              action={
                <FormDialog
                  title="Thêm người liên hệ"
                  version={sig("add-contact")}
                  triggerLabel="Thêm"
                  triggerIcon={<Plus />}
                  triggerSize="sm"
                >
                  <WorkCaseActionForm action={addWorkCaseContact.bind(null, item.id)} className="grid gap-3 sm:grid-cols-2">
                    <Field label="Họ tên" className="sm:col-span-2">
                      <Input name="name" required />
                    </Field>
                    <Field label="Vai trò">
                      <Input name="role" />
                    </Field>
                    <Field label="Điện thoại">
                      <Input name="phone" />
                    </Field>
                    <Field label="Email" className="sm:col-span-2">
                      <Input name="email" type="email" />
                    </Field>
                    <div className="flex justify-end sm:col-span-2">
                      <Button type="submit">Thêm người liên hệ</Button>
                    </div>
                  </WorkCaseActionForm>
                </FormDialog>
              }
            >
              {item.contacts.length ? (
                <ul className="divide-y">
                  {item.contacts.map((contact) => (
                    <li key={contact.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={contact.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {contact.name}
                          {contact.role && <span className="font-normal text-muted-foreground"> · {contact.role}</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[contact.phone, contact.email].filter(Boolean).join(" · ") || "Chưa có thông tin liên lạc"}
                        </p>
                      </div>
                      <FormDialog
                        title="Sửa người liên hệ"
                        description={contact.name}
                        version={sig(contact.id, contact.name, contact.role, contact.phone, contact.email)}
                        triggerLabel="Sửa"
                        triggerIcon={<Pencil />}
                        triggerVariant="ghost"
                        triggerSize="sm"
                      >
                        <WorkCaseActionForm
                          action={updateWorkCaseContact.bind(null, item.id, contact.id)}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          <Field label="Họ tên" className="sm:col-span-2">
                            <Input name="name" defaultValue={contact.name} />
                          </Field>
                          <Field label="Vai trò">
                            <Input name="role" defaultValue={contact.role ?? ""} />
                          </Field>
                          <Field label="Điện thoại">
                            <Input name="phone" defaultValue={contact.phone ?? ""} />
                          </Field>
                          <Field label="Email" className="sm:col-span-2">
                            <Input name="email" type="email" defaultValue={contact.email ?? ""} />
                          </Field>
                          <div className="flex justify-end sm:col-span-2">
                            <Button type="submit">Lưu thay đổi</Button>
                          </div>
                        </WorkCaseActionForm>
                        <WorkCaseActionForm
                          action={deleteWorkCaseContact.bind(null, item.id, contact.id)}
                          className="border-t pt-3"
                        >
                          <Button type="submit" variant="destructive" size="sm">
                            <Trash2 />
                            Xóa người liên hệ
                          </Button>
                        </WorkCaseActionForm>
                      </FormDialog>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="Chưa có người liên hệ." />
              )}
            </Section>

            <Section
              title="Người đi tour"
              description="Có thể bổ sung sau nhưng cần ít nhất một người trước khi đặt dịch vụ."
              action={
                <FormDialog
                  title="Thêm người đi tour"
                  version={sig("add-traveler")}
                  triggerLabel="Thêm"
                  triggerIcon={<Plus />}
                  triggerSize="sm"
                >
                  <WorkCaseActionForm action={addWorkCaseTraveler.bind(null, item.id)} className="space-y-3">
                    <Field label="Họ tên">
                      <Input name="fullName" required />
                    </Field>
                    <Field label="Ghi chú">
                      <Input name="notes" />
                    </Field>
                    <div className="flex justify-end">
                      <Button type="submit">Thêm người đi tour</Button>
                    </div>
                  </WorkCaseActionForm>
                </FormDialog>
              }
            >
              {item.travelers.length ? (
                <ul className="divide-y">
                  {item.travelers.map((traveler) => (
                    <li key={traveler.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={traveler.fullName} className="bg-emerald-100 text-emerald-700" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{traveler.fullName}</p>
                        {traveler.notes && <p className="truncate text-xs text-muted-foreground">{traveler.notes}</p>}
                      </div>
                      <FormDialog
                        title="Sửa người đi tour"
                        description={traveler.fullName}
                        version={sig(traveler.id, traveler.fullName, traveler.notes)}
                        triggerLabel="Sửa"
                        triggerIcon={<Pencil />}
                        triggerVariant="ghost"
                        triggerSize="sm"
                      >
                        <WorkCaseActionForm
                          action={updateWorkCaseTraveler.bind(null, item.id, traveler.id)}
                          className="space-y-3"
                        >
                          <Field label="Họ tên">
                            <Input name="fullName" defaultValue={traveler.fullName} />
                          </Field>
                          <Field label="Ghi chú">
                            <Input name="notes" defaultValue={traveler.notes ?? ""} />
                          </Field>
                          <div className="flex justify-end">
                            <Button type="submit">Lưu thay đổi</Button>
                          </div>
                        </WorkCaseActionForm>
                        <WorkCaseActionForm
                          action={deleteWorkCaseTraveler.bind(null, item.id, traveler.id)}
                          className="border-t pt-3"
                        >
                          <Button type="submit" variant="destructive" size="sm">
                            <Trash2 />
                            Xóa người đi tour
                          </Button>
                        </WorkCaseActionForm>
                      </FormDialog>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="Chưa có người đi tour." />
              )}
            </Section>
          </div>
        </TabsContent>

        {/* --- Đặt dịch vụ --- */}
        <TabsContent value="bookings">
          <Section
            title="Đặt dịch vụ"
            description="Cần có người đi tour trước khi tạo booking."
            action={
              <FormDialog
                title="Tạo booking"
                version={sig("add-booking")}
                triggerLabel="Tạo booking"
                triggerIcon={<Plus />}
                triggerSize="sm"
                className="sm:max-w-xl"
              >
                <WorkCaseActionForm action={createBooking.bind(null, item.id)} className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nhu cầu" className="sm:col-span-2">
                    <select name="workCaseItemId" required className={selectClass}>
                      <option value="">Chọn nhu cầu</option>
                      {item.items.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.productNameSnapshot}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nhà cung cấp">
                    <select name="supplierId" className={selectClass}>
                      <option value="">Nhập nhà cung cấp</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Hoặc nhập tên nhà cung cấp">
                    <Input name="supplierName" placeholder="Tên nhà cung cấp nhập tay" />
                  </Field>
                  <Field label="Mã booking/xác nhận">
                    <Input name="referenceCode" />
                  </Field>
                  <Field label="Ngày sử dụng dịch vụ">
                    <Input name="serviceAt" type="date" />
                  </Field>
                  <Field label="Ghi chú" className="sm:col-span-2">
                    <Input name="notes" />
                  </Field>
                  <div className="flex justify-end sm:col-span-2">
                    <Button type="submit">Tạo booking</Button>
                  </div>
                </WorkCaseActionForm>
              </FormDialog>
            }
          >
            {item.bookings.length ? (
              <ul className="divide-y">
                {item.bookings.map((booking) => (
                  <li key={booking.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <Ticket className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-sm font-medium text-slate-900">{booking.supplierNameSnapshot}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.workCaseItem.productNameSnapshot} ·{" "}
                        {booking.serviceAt ? fmtDate(booking.serviceAt) : "Chưa có ngày"} ·{" "}
                        {booking.referenceCode || "Chưa có mã"}
                      </p>
                      {booking.notes && <p className="mt-0.5 text-xs text-slate-500">{booking.notes}</p>}
                    </div>
                    <Badge variant="outline" className={bookingStatusBadge[booking.status]}>
                      {bookingStatusLabel[booking.status]}
                    </Badge>
                    <WorkCaseActionForm action={changeBookingStatus.bind(null, item.id, booking.id)} className="flex gap-2">
                      <select name="status" defaultValue={booking.status} className={smallSelectClass}>
                        {Object.entries(bookingStatusLabel).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Lưu
                      </Button>
                    </WorkCaseActionForm>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Chưa có booking nào." />
            )}
          </Section>
        </TabsContent>

        {/* --- Giao việc --- */}
        <TabsContent value="tasks">
          <Section
            title="Giao việc"
            action={
              canCancelTasks && (
                <FormDialog
                  title="Giao việc"
                  version={sig("add-task")}
                  triggerLabel="Giao việc"
                  triggerIcon={<Plus />}
                  triggerSize="sm"
                  className="sm:max-w-xl"
                >
                  <WorkCaseActionForm action={createWorkTask.bind(null, item.id)} className="grid gap-3 sm:grid-cols-2">
                    <Field label="Tên công việc" className="sm:col-span-2">
                      <Input name="title" required />
                    </Field>
                    <Field label="Người thực hiện">
                      <select name="assigneeId" required className={selectClass}>
                        <option value="">Chọn người thực hiện</option>
                        {departmentUsers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.fullName}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Ưu tiên">
                      <select name="priority" defaultValue="NORMAL" className={selectClass}>
                        <option value="LOW">Thấp</option>
                        <option value="NORMAL">Bình thường</option>
                        <option value="HIGH">Cao</option>
                        <option value="URGENT">Khẩn cấp</option>
                      </select>
                    </Field>
                    <Field label="Ngày bắt đầu">
                      <Input name="startAt" type="date" />
                    </Field>
                    <Field label="Hạn hoàn thành">
                      <Input name="dueAt" type="date" />
                    </Field>
                    <Field label="Mô tả" className="sm:col-span-2">
                      <Input name="description" />
                    </Field>
                    <div className="flex justify-end sm:col-span-2">
                      <Button type="submit">Giao việc</Button>
                    </div>
                  </WorkCaseActionForm>
                </FormDialog>
              )
            }
          >
            {item.tasks.length ? (
              <div className="space-y-4 p-4">
                {item.tasks.map((task) => <WorkTaskPanel key={task.id} task={task} users={departmentUsers} userId={user.id} isAdmin={user.role === "ADMIN"} canManage={canCancelTasks} />)}
              </div>
            ) : (
              <Empty text="Chưa có công việc nào." />
            )}
          </Section>
        </TabsContent>

        {/* --- Hoạt động --- */}
        <TabsContent value="activity">
          <Section title="Lịch sử hoạt động">
            {item.activities.length ? (
              <ol className="relative ml-6 space-y-5 border-l-2 border-slate-200 py-5 pr-4">
                {item.activities.map((activity) => (
                  <li key={activity.id} className="relative pl-5">
                    <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-white bg-sky-500 ring-2 ring-sky-100" />
                    <p className="text-sm text-slate-800">{activity.summary}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activity.actorName} · {fmtDateTime(activity.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty text="Chưa có hoạt động." />
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
