import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { createChannelData, setChannelDataActive, updateChannelData, type ChannelMasterDataKind } from "@/app/actions/channels";
import { ChannelForm } from "@/components/channel-form";
import { FormDialog } from "@/components/form-dialog";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MasterDataItem = { id: string; code: string; name: string; description: string | null; metadata: unknown; active: boolean; updatedAt: Date };

function MasterDataTab({ kind, label, description, items }: { kind: ChannelMasterDataKind; label: string; description: string; items: MasterDataItem[] }) {
  return <TabsContent value={kind} className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-4"><p className="text-sm text-muted-foreground">{description}</p><FormDialog title={`Tạo ${label}`} description={`${label} mới sẽ sẵn sàng cho các module nghiệp vụ sử dụng.`} version={items.length} triggerLabel={`Tạo ${label}`} triggerIcon={<Plus />} className="sm:max-w-2xl"><ChannelForm action={createChannelData.bind(null, kind)} prefix={`new-${kind}`} label={label} /></FormDialog></div><Card className="gap-0 overflow-hidden p-0"><Table><TableHeader><TableRow className="bg-slate-50/80"><TableHead className="pl-4">{label}</TableHead><TableHead>Mô tả</TableHead><TableHead>Metadata</TableHead><TableHead>Trạng thái</TableHead><TableHead className="pr-4 text-right">Thao tác</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell className="pl-4"><p className="font-medium">{item.name}</p><code className="text-xs text-muted-foreground">{item.code}</code></TableCell><TableCell className="max-w-sm text-sm text-muted-foreground">{item.description || "—"}</TableCell><TableCell>{Object.keys(item.metadata as Record<string, unknown>).length} trường</TableCell><TableCell><Badge variant="outline" className={item.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>{item.active ? "Hoạt động" : "Đã lưu trữ"}</Badge></TableCell><TableCell className="pr-4"><div className="flex justify-end gap-1"><FormDialog title={item.name} version={item.updatedAt.getTime()} triggerLabel="Chi tiết" triggerVariant="ghost" triggerSize="sm" className="sm:max-w-2xl"><ChannelForm action={updateChannelData.bind(null, kind, item.id)} item={item} prefix={`${kind}-${item.id}`} label={label} /></FormDialog><WorkCaseActionForm action={setChannelDataActive.bind(null, kind, item.id, !item.active)}><Button type="submit" variant="ghost" size="sm">{item.active ? <Archive /> : <ArchiveRestore />}{item.active ? "Lưu trữ" : "Khôi phục"}</Button></WorkCaseActionForm></div></TableCell></TableRow>)}{!items.length && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Chưa có {label}.</TableCell></TableRow>}</TableBody></Table></Card></TabsContent>;
}

export default async function ChannelsPage() {
  await requireAdmin();
  const [channels, countries, leadSources, travelTypes, leadStatuses, leadQualities, preferredContacts, hotelCategories, bookingStatuses, paymentStatuses, followUpStatuses, lostReasons, mealPreferences] = await Promise.all([
    prisma.channel.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.country.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.leadSource.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.travelType.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.leadStatus.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.leadQuality.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.preferredContact.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.hotelCategory.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.leadBookingStatus.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.paymentStatus.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.followUpStatus.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.lostReason.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.mealPreference.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Kênh và phân loại</h1><p className="text-sm text-muted-foreground">Quản lý các danh mục dùng chung cho Lead và nghiệp vụ du lịch.</p></div><Tabs defaultValue="channel" className="gap-5"><TabsList className="h-auto max-w-full flex-wrap justify-start"><TabsTrigger value="channel">Channel</TabsTrigger><TabsTrigger value="country">Country</TabsTrigger><TabsTrigger value="leadSource">Lead Source</TabsTrigger><TabsTrigger value="travelType">Travel Type</TabsTrigger><TabsTrigger value="leadStatus">Lead Status</TabsTrigger><TabsTrigger value="leadQuality">Lead Quality</TabsTrigger><TabsTrigger value="preferredContact">Preferred Contact</TabsTrigger><TabsTrigger value="hotelCategory">Hotel Category</TabsTrigger><TabsTrigger value="leadBookingStatus">Booking Status</TabsTrigger><TabsTrigger value="paymentStatus">Payment Status</TabsTrigger><TabsTrigger value="followUpStatus">Follow-up Status</TabsTrigger><TabsTrigger value="lostReason">Lost Reason</TabsTrigger><TabsTrigger value="mealPreference">Meal Preference</TabsTrigger></TabsList><MasterDataTab kind="channel" label="Channel" description="Các kênh tiếp cận khách hàng." items={channels} /><MasterDataTab kind="country" label="Country" description="Danh mục quốc gia." items={countries} /><MasterDataTab kind="leadSource" label="Lead Source" description="Nguồn tiếp cận khách hàng và cơ hội kinh doanh." items={leadSources} /><MasterDataTab kind="travelType" label="Travel Type" description="Các loại hình du lịch và hành trình." items={travelTypes} /><MasterDataTab kind="leadStatus" label="Lead Status" description="Các trạng thái xử lý Lead." items={leadStatuses} /><MasterDataTab kind="leadQuality" label="Lead Quality" description="Các mức đánh giá chất lượng Lead." items={leadQualities} /><MasterDataTab kind="preferredContact" label="Preferred Contact" description="Các phương thức liên hệ khách hàng ưu tiên." items={preferredContacts} /><MasterDataTab kind="hotelCategory" label="Hotel Category" description="Các hạng khách sạn." items={hotelCategories} /><MasterDataTab kind="leadBookingStatus" label="Booking Status" description="Các trạng thái booking của Lead." items={bookingStatuses} /><MasterDataTab kind="paymentStatus" label="Payment Status" description="Các trạng thái thanh toán." items={paymentStatuses} /><MasterDataTab kind="followUpStatus" label="Follow-up Status" description="Các trạng thái chăm sóc và theo dõi Lead." items={followUpStatuses} /><MasterDataTab kind="lostReason" label="Lost Reason" description="Các lý do Lead không tiếp tục hoặc bị mất." items={lostReasons} /><MasterDataTab kind="mealPreference" label="Meal Preference" description="Các lựa chọn và yêu cầu bữa ăn." items={mealPreferences} /></Tabs></div>;
}
