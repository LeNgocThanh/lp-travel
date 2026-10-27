import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Columns3,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { changeWorkTaskStatus } from "@/app/actions/bookings-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { departmentIdsWithPermission } from "@/lib/department-permissions";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const TZ = "Asia/Ho_Chi_Minh";

const columns = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;

const statusMeta: Record<string, { label: string; dot: string; badge: string }> = {
  TODO: { label: "Cần làm", dot: "bg-slate-400", badge: "border-slate-200 bg-slate-100 text-slate-700" },
  IN_PROGRESS: { label: "Đang làm", dot: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700" },
  BLOCKED: { label: "Bị chặn", dot: "bg-red-500", badge: "border-red-200 bg-red-50 text-red-700" },
  DONE: { label: "Hoàn tất", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Đã hủy", dot: "bg-slate-300", badge: "border-slate-200 bg-slate-50 text-slate-500" },
};

const priorityMeta: Record<string, { label: string; className: string }> = {
  LOW: { label: "Thấp", className: "border-slate-200 bg-slate-50 text-slate-600" },
  NORMAL: { label: "Bình thường", className: "border-sky-200 bg-sky-50 text-sky-700" },
  HIGH: { label: "Cao", className: "border-amber-200 bg-amber-50 text-amber-700" },
  URGENT: { label: "Khẩn cấp", className: "border-red-200 bg-red-50 text-red-700" },
};

const views = [
  { key: "kanban", label: "Kanban", icon: Columns3 },
  { key: "timeline", label: "Timeline", icon: CalendarRange },
];

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("vi-VN", { timeZone: TZ }) : "—");
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
};

function Stat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <Card className="flex-row items-center gap-3 p-4">
      <span className={cn("flex size-10 items-center justify-center rounded-lg", className)}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; assignee?: string; department?: string; due?: string }> }) {
  const user = await requireUser();
  const { view = "kanban", status = "", assignee = "", department = "", due = "" } = await searchParams;
  const managedIds = await departmentIdsWithPermission(user, "canAssignTasks");
  const tasks = await prisma.workTask.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { assignments: { some: { userId: user.id } } },
              { workCase: { receiverId: user.id } },
              { workCase: { departmentId: { in: managedIds ?? [] } } },
            ],
          },
    include: { workCase: { include: { department: true } }, assignments: { include: { user: true } } },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  type TaskItem = (typeof tasks)[number];
  const todayKey = dayKey(new Date());
  const isOverdue = (task: TaskItem) =>
    !!task.dueAt && dayKey(task.dueAt) < todayKey && task.status !== "DONE" && task.status !== "CANCELLED";
  const isDueSoon = (task: TaskItem) => {
    if (!task.dueAt || ["DONE", "CANCELLED"].includes(task.status)) return false;
    const difference = (new Date(`${dayKey(task.dueAt)}T00:00:00+07:00`).getTime() - new Date(`${todayKey}T00:00:00+07:00`).getTime()) / 86400000;
    return difference >= 0 && difference <= 3;
  };
  const filteredTasks = tasks.filter((task) => {
    if (status && task.status !== status) return false;
    if (assignee && !task.assignments.some((item) => item.userId === assignee)) return false;
    if (department && task.workCase.departmentId !== department) return false;
    if (due === "overdue" && !isOverdue(task)) return false;
    if (due === "today" && (!task.dueAt || dayKey(task.dueAt) !== todayKey)) return false;
    if (due === "upcoming" && (!task.dueAt || dayKey(task.dueAt) <= todayKey || ["DONE", "CANCELLED"].includes(task.status))) return false;
    if (due === "none" && task.dueAt) return false;
    return true;
  });
  const departmentOptions = [...new Map(tasks.map((task) => [task.workCase.departmentId, { id: task.workCase.departmentId, name: task.workCase.department.name }])).values()];
  const assigneeOptions = [...new Map(tasks.flatMap((task) => task.assignments.map((item) => [item.userId, { id: item.userId, name: item.user.fullName }] as const))).values()];

  const stats = {
    total: filteredTasks.length,
    inProgress: filteredTasks.filter((t) => t.status === "IN_PROGRESS").length,
    overdue: filteredTasks.filter(isOverdue).length,
    done: filteredTasks.filter((t) => t.status === "DONE").length,
  };

  const renderCard = (task: TaskItem, showStatus: boolean) => {
    const isAssignee = task.assignments.some((item) => item.userId === user.id);
    const canCancel =
      user.role === "ADMIN" ||
      task.workCase.receiverId === user.id ||
      (managedIds ?? []).includes(task.workCase.departmentId);
    const canChangeStatus = user.role === "ADMIN" || isAssignee;
    const statuses = user.role === "ADMIN" ? columns : columns.filter((status) => status !== "CANCELLED");
    const overdue = isOverdue(task);
    const dueSoon = isDueSoon(task);
    const priority = priorityMeta[task.priority] ?? priorityMeta.NORMAL;
    const assignees = task.assignments;

    return (
      <Card key={task.id} className={cn("gap-3 p-4 shadow-xs", overdue ? "border-red-200" : dueSoon && "border-amber-200")}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{task.title}</h3>
          <Badge variant="outline" className={cn("shrink-0", priority.className)}>
            {priority.label}
          </Badge>
        </div>

        <div className="min-w-0 space-y-0.5">
          <Link
            href={`/work/${task.workCaseId}`}
            className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
          >
            {task.workCase.code}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{task.workCase.title}</p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <CalendarDays className="size-3.5 shrink-0 text-slate-400" />
          <span>
            {fmtDate(task.startAt)} → {" "}
            <span className={cn(overdue && "font-medium text-red-600")}>{fmtDate(task.dueAt)}</span>
          </span>
          {overdue && (
            <span className="ml-auto rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">
              Quá hạn
            </span>
          )}
          {!overdue && dueSoon && <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Sắp đến hạn</span>}
        </div>

        <div className="flex items-center gap-2">
          {assignees.length ? (
            <>
              <div className="flex shrink-0 -space-x-2">
                {assignees.slice(0, 3).map((item) => (
                  <span
                    key={item.userId}
                    title={item.user.fullName}
                    className="flex size-6 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-700 ring-2 ring-white"
                  >
                    {initials(item.user.fullName)}
                  </span>
                ))}
                {assignees.length > 3 && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                    +{assignees.length - 3}
                  </span>
                )}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {assignees.map((item) => item.user.fullName).join(", ")}
              </span>
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">Chưa giao cho ai</span>
          )}
          {showStatus && (
            <Badge variant="outline" className={cn("ml-auto shrink-0", statusMeta[task.status]?.badge)}>
              {statusMeta[task.status]?.label}
            </Badge>
          )}
        </div>

        <div className="border-t pt-3">
          {canChangeStatus && (user.role === "ADMIN" || task.status !== "CANCELLED") ? (
            <WorkCaseActionForm action={changeWorkTaskStatus.bind(null, task.id)} className="flex gap-2">
              <select
                name="status"
                defaultValue={task.status}
                className="h-8 min-w-0 flex-1 rounded-md border border-input bg-white px-2 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusMeta[status].label}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Lưu
              </Button>
            </WorkCaseActionForm>
          ) : canCancel && task.status !== "CANCELLED" ? (
            <WorkCaseActionForm action={changeWorkTaskStatus.bind(null, task.id)}>
              <input type="hidden" name="status" value="CANCELLED" />
              <Button type="submit" size="sm" variant="destructive" className="w-full">
                Hủy công việc
              </Button>
            </WorkCaseActionForm>
          ) : (
            <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem công việc này.</p>
          )}
        </div>
      </Card>
    );
  };

  // Timeline: nhóm theo ngày hạn (tasks đã sắp theo dueAt tăng dần, không có hạn nằm cuối)
  const groups: { key: string; label: string; tasks: TaskItem[]; overdue: boolean; today: boolean }[] = [];
  if (view === "timeline") {
    for (const task of filteredTasks) {
      const key = task.dueAt ? dayKey(task.dueAt) : "none";
      let group = groups[groups.length - 1];
      if (!group || group.key !== key) {
        group = {
          key,
          label: task.dueAt
            ? task.dueAt.toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                timeZone: TZ,
              })
            : "Chưa có hạn",
          tasks: [],
          overdue: false,
          today: key === todayKey,
        };
        groups.push(group);
      }
      group.tasks.push(task);
      if (isOverdue(task)) group.overdue = true;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Theo dõi công việc</h1>
          <p className="mt-1 text-sm text-muted-foreground">Công việc trong các hồ sơ bạn được phép truy cập.</p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
          {views.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/tasks?view=${key}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
                view === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ListChecks} label="Tổng công việc" value={stats.total} className="bg-slate-100 text-slate-600" />
        <Stat icon={Clock} label="Đang làm" value={stats.inProgress} className="bg-sky-50 text-sky-600" />
        <Stat icon={AlertTriangle} label="Quá hạn" value={stats.overdue} className="bg-red-50 text-red-600" />
        <Stat icon={CheckCircle2} label="Hoàn tất" value={stats.done} className="bg-emerald-50 text-emerald-600" />
      </div>

      <form method="get" className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5">
        <input type="hidden" name="view" value={view} />
        <select name="status" defaultValue={status} className="h-9 rounded-md border bg-transparent px-2 text-sm"><option value="">Mọi trạng thái</option>{columns.map((value) => <option key={value} value={value}>{statusMeta[value].label}</option>)}</select>
        <select name="assignee" defaultValue={assignee} className="h-9 rounded-md border bg-transparent px-2 text-sm"><option value="">Mọi người thực hiện</option>{assigneeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="department" defaultValue={department} className="h-9 rounded-md border bg-transparent px-2 text-sm"><option value="">Mọi phòng ban</option>{departmentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="due" defaultValue={due} className="h-9 rounded-md border bg-transparent px-2 text-sm"><option value="">Mọi thời hạn</option><option value="overdue">Quá hạn</option><option value="today">Đến hạn hôm nay</option><option value="upcoming">Sắp tới</option><option value="none">Chưa có hạn</option></select>
        <div className="flex gap-2"><Button type="submit" className="flex-1">Lọc</Button><Button nativeButton={false} render={<Link href={`/tasks?view=${view}`} />} variant="outline">Xóa lọc</Button></div>
      </form>

      {!filteredTasks.length ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white py-16 text-center">
          <ListChecks className="size-8 text-slate-300" />
          <p className="text-sm text-muted-foreground">Chưa có công việc.</p>
        </div>
      ) : view === "timeline" ? (
        <div className="relative ml-2 space-y-8 border-l-2 border-slate-200 pl-6">
          {groups.map((group) => (
            <section key={group.key} className="relative">
              <span
                className={cn(
                  "absolute -left-[31px] top-1 size-3 rounded-full border-2 border-white ring-2",
                  group.overdue
                    ? "bg-red-500 ring-red-200"
                    : group.today
                      ? "bg-sky-500 ring-sky-200"
                      : "bg-slate-300 ring-slate-200",
                )}
              />
              <div className="mb-3 flex items-center gap-2">
                <h2 className={cn("text-sm font-semibold capitalize", group.overdue ? "text-red-600" : "text-slate-800")}>
                  {group.label}
                </h2>
                {group.today && (
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                    Hôm nay
                  </Badge>
                )}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {group.tasks.length}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {group.tasks.map((task) => renderCard(task, true))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-4 overflow-x-auto pb-3">
          {columns.map((status) => {
            const list = filteredTasks.filter((task) => task.status === status);
            const meta = statusMeta[status];
            return (
              <section
                key={status}
                className="flex min-w-[17rem] flex-1 flex-col rounded-xl bg-slate-100/70 p-2.5"
              >
                <header className="mb-2.5 flex items-center gap-2 px-1.5">
                  <span className={cn("size-2 rounded-full", meta.dot)} />
                  <h2 className="text-sm font-semibold text-slate-700">{meta.label}</h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-xs">
                    {list.length}
                  </span>
                </header>
                <div className="space-y-2.5">{list.map((task) => renderCard(task, false))}</div>
                {!list.length && (
                  <p className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                    Không có công việc
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
