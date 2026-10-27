import Link from "next/link";
import { notFound } from "next/navigation";
import { addPostComment, archivePost, publishPost, setPostPinned, updatePostContent } from "@/app/actions/news";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { newsPostScope } from "@/lib/news-access";
import { prisma } from "@/lib/prisma";

const statusLabel: Record<string, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đã đăng", ARCHIVED: "Đã lưu trữ" };

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, ...(await newsPostScope(user)) }, include: { audiences: { include: { department: true } }, comments: { orderBy: { createdAt: "asc" } } } });
  if (!post) notFound();
  const canEdit = user.role === "ADMIN" || post.authorId === user.id;
  return <div className="space-y-5"><Button nativeButton={false} render={<Link href="/news" />} variant="ghost">← Bảng tin</Button><Card><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle>{post.title}</CardTitle><Badge variant="outline">{statusLabel[post.status]}</Badge>{post.pinnedAt && <Badge>Đã ghim</Badge>}</div><CardDescription>{post.authorName} · {(post.publishedAt ?? post.createdAt).toLocaleString("vi-VN")} · {post.audienceType === "ALL" ? "Toàn công ty" : post.audiences.map((item) => item.department.name).join(", ")}</CardDescription></CardHeader><CardContent className="space-y-4"><p className="whitespace-pre-wrap">{post.body}</p>{canEdit && post.status !== "ARCHIVED" && <details><summary className="cursor-pointer text-sm font-medium">Sửa nội dung</summary><WorkCaseActionForm action={updatePostContent.bind(null, post.id)} className="mt-3 grid gap-3"><Input name="title" defaultValue={post.title} required minLength={2} maxLength={200} /><Textarea name="body" defaultValue={post.body} required minLength={2} maxLength={20000} className="min-h-32" /><Button type="submit" variant="outline" className="justify-self-start">Lưu nội dung</Button></WorkCaseActionForm></details>}{canEdit && <div className="flex flex-wrap gap-2">{post.status === "DRAFT" && <WorkCaseActionForm action={publishPost.bind(null, post.id)}><Button type="submit">Đăng bài</Button></WorkCaseActionForm>}{user.role === "ADMIN" && post.status === "PUBLISHED" && <WorkCaseActionForm action={setPostPinned.bind(null, post.id, !post.pinnedAt)}><Button type="submit" variant="outline">{post.pinnedAt ? "Bỏ ghim" : "Ghim bài"}</Button></WorkCaseActionForm>}{post.status !== "ARCHIVED" && <WorkCaseActionForm action={archivePost.bind(null, post.id)}><Button type="submit" variant="destructive">Lưu trữ</Button></WorkCaseActionForm>}</div>}</CardContent></Card>
    {post.status === "PUBLISHED" && <Card><CardHeader><CardTitle>Trao đổi ({post.comments.length})</CardTitle></CardHeader><CardContent className="space-y-3">{post.comments.map((comment) => <div key={comment.id} className="rounded-md bg-muted/50 p-3"><p className="whitespace-pre-wrap text-sm">{comment.content}</p><p className="mt-1 text-xs text-muted-foreground">{comment.actorName} · {comment.createdAt.toLocaleString("vi-VN")}</p></div>)}{!post.comments.length && <p className="text-sm text-muted-foreground">Chưa có bình luận.</p>}<WorkCaseActionForm action={addPostComment.bind(null, post.id)} className="flex items-end gap-2"><Textarea name="content" required maxLength={3000} placeholder="Viết bình luận" /><Button type="submit">Gửi</Button></WorkCaseActionForm></CardContent></Card>}
  </div>;
}
