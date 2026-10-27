import { addWorkTaskChecklistItem, addWorkTaskComment, changeWorkTaskStatus, deleteWorkTaskChecklistItem, toggleWorkTaskChecklistItem, updateWorkTask } from "@/app/actions/bookings-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";

const statusLabels: Record<string, string> = { TODO: "Cần làm", IN_PROGRESS: "Đang làm", BLOCKED: "Bị chặn", DONE: "Hoàn tất", CANCELLED: "Đã hủy" };
const executionStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

type Task = {
  id: string; title: string; description: string | null; status: string; priority: string; startAt: Date | null; dueAt: Date | null;
  assignments: Array<{ userId: string; user: { fullName: string } }>;
  comments: Array<{ id: string; content: string; actorName: string; createdAt: Date }>;
  checklist: Array<{ id: string; title: string; completed: boolean; completedByName: string | null }>;
};
type UserOption = { id: string; fullName: string };

export function WorkTaskPanel({ task, users, userId, isAdmin, canManage }: { task: Task; users: UserOption[]; userId: string; isAdmin: boolean; canManage: boolean }) {
  const isAssignee = task.assignments.some((assignment) => assignment.userId === userId);
  const canChangeStatus = isAdmin || isAssignee;
  const canUpdateChecklist = isAssignee || canManage;
  const statuses = isAdmin ? [...executionStatuses, "CANCELLED"] : executionStatuses;
  const currentAssigneeId = task.assignments[0]?.userId ?? "";

  return <div className="space-y-4 rounded-md border p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{task.assignments.map((assignment) => assignment.user.fullName).join(", ") || "Chưa giao"} · Hạn {task.dueAt?.toLocaleDateString("vi-VN") || "chưa có"}</p></div><Badge>{statusLabels[task.status]}</Badge></div>

    {canChangeStatus && (isAdmin || task.status !== "CANCELLED") ? <WorkCaseActionForm action={changeWorkTaskStatus.bind(null, task.id)} className="flex max-w-md gap-2"><select name="status" defaultValue={task.status} className="h-9 min-w-0 flex-1 rounded-md border bg-transparent px-2">{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><Button type="submit" variant="outline">Lưu trạng thái</Button></WorkCaseActionForm> : canManage && task.status !== "CANCELLED" ? <WorkCaseActionForm action={changeWorkTaskStatus.bind(null, task.id)}><input type="hidden" name="status" value="CANCELLED" /><Button type="submit" variant="destructive">Hủy công việc</Button></WorkCaseActionForm> : <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem trạng thái công việc.</p>}

    {canManage && <details><summary className="cursor-pointer text-sm font-medium">Sửa và giao lại công việc</summary><WorkCaseActionForm action={updateWorkTask.bind(null, task.id)} className="mt-3 grid gap-2 md:grid-cols-3"><Input name="title" defaultValue={task.title} required minLength={2} maxLength={200} /><select name="assigneeId" defaultValue={currentAssigneeId} required className="h-9 rounded-md border bg-transparent px-2"><option value="">Chọn người thực hiện</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select><select name="priority" defaultValue={task.priority} className="h-9 rounded-md border bg-transparent px-2"><option value="LOW">Thấp</option><option value="NORMAL">Bình thường</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option></select><Input name="startAt" type="date" defaultValue={task.startAt?.toISOString().slice(0, 10)} /><Input name="dueAt" type="date" defaultValue={task.dueAt?.toISOString().slice(0, 10)} /><Input name="description" defaultValue={task.description ?? ""} placeholder="Mô tả" /><Button type="submit" variant="outline">Lưu công việc</Button></WorkCaseActionForm></details>}

    <div className="space-y-2 border-t pt-3"><h4 className="text-sm font-medium">Checklist ({task.checklist.filter((item) => item.completed).length}/{task.checklist.length})</h4>{task.checklist.map((item) => <div key={item.id} className="flex items-center gap-2 text-sm">{canUpdateChecklist && <WorkCaseActionForm action={toggleWorkTaskChecklistItem.bind(null, task.id, item.id)}><input type="hidden" name="completed" value={String(!item.completed)} /><Button type="submit" size="sm" variant="outline">{item.completed ? "Mở lại" : "Hoàn tất"}</Button></WorkCaseActionForm>}<span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.title}</span>{item.completedByName && <span className="text-xs text-muted-foreground">· {item.completedByName}</span>}{canManage && <WorkCaseActionForm action={deleteWorkTaskChecklistItem.bind(null, task.id, item.id)} className="ml-auto"><Button type="submit" size="sm" variant="ghost">Xóa</Button></WorkCaseActionForm>}</div>)}{!task.checklist.length && <p className="text-xs text-muted-foreground">Chưa có mục checklist.</p>}{canManage && <WorkCaseActionForm action={addWorkTaskChecklistItem.bind(null, task.id)} className="flex gap-2"><Input name="title" placeholder="Thêm mục checklist" required maxLength={300} /><Button type="submit" variant="outline">Thêm</Button></WorkCaseActionForm>}</div>

    <div className="space-y-2 border-t pt-3"><h4 className="text-sm font-medium">Trao đổi</h4>{task.comments.map((comment) => <div key={comment.id} className="rounded-md bg-muted/50 p-2 text-sm"><p className="whitespace-pre-wrap">{comment.content}</p><p className="mt-1 text-xs text-muted-foreground">{comment.actorName} · {comment.createdAt.toLocaleString("vi-VN")}</p></div>)}{!task.comments.length && <p className="text-xs text-muted-foreground">Chưa có bình luận.</p>}<WorkCaseActionForm action={addWorkTaskComment.bind(null, task.id)} className="flex items-end gap-2"><Textarea name="content" placeholder="Nhập trao đổi về công việc" required maxLength={3000} /><Button type="submit">Gửi</Button></WorkCaseActionForm></div>
  </div>;
}
