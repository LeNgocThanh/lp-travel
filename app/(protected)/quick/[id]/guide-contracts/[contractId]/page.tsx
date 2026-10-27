import Link from "next/link";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import { notFound } from "next/navigation";
import { regenerateTourGuideContract, updateTourGuideContract } from "@/app/actions/tour-guide-contracts";
import { TourGuideContractDocument } from "@/components/tour-guide-contract-document";
import { TourGuideContractDocxButton } from "@/components/tour-guide-contract-docx-button";
import { TourGuideContractForm } from "@/components/tour-guide-contract-form";
import { TourGuideContractPrintButton } from "@/components/tour-guide-contract-print-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkCaseActionForm } from "@/components/work-case-action-form";
import { requireUser } from "@/lib/auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (date: Date | null) => date ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date) : "—";
const money = (value: { toString(): string }) => Number(value.toString()).toLocaleString("vi-VN") + " VNĐ";

export default async function TourGuideContractPage({ params, searchParams }: { params: Promise<{ id: string; contractId: string }>; searchParams: Promise<{ edit?: string }> }) {
  const actor = await requireUser(); const { id, contractId } = await params; const { edit } = await searchParams;
  const canRead = await hasResourceAction(actor, "LEADS", "READ"); const canEdit = await hasResourceAction(actor, "LEADS", "UPDATE");
  if (!canRead || (edit === "1" && !canEdit)) notFound();
  const [contract, users, templates] = await Promise.all([prisma.tourGuideContract.findFirst({ where: { id: contractId, itineraryId: id } }), prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }), prisma.documentTemplate.findMany({ where: { type: { in: ["HEADER", "FOOTER"] } }, select: { id: true, name: true, type: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] })]);
  if (!contract) notFound();
  if (edit === "1") return <div className="space-y-5"><Link href={`/quick/${id}/guide-contracts/${contract.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Quay lại hợp đồng</Link><h1 className="text-2xl font-semibold">Sửa hợp đồng {contract.contractNumber}</h1><TourGuideContractForm action={updateTourGuideContract.bind(null, contract.id)} users={users} templates={templates} initial={{ contractNumber: contract.contractNumber, contractDate: dateValue(contract.contractDate), serviceStartDate: dateValue(contract.serviceStartDate), serviceEndDate: dateValue(contract.serviceEndDate), workingDayCount: contract.workingDayCount, signerUserId: contract.signerUserId ?? "", signerTitle: contract.signerTitle, authorizationNumber: contract.authorizationNumber ?? "", dailyRateVnd: contract.dailyRateVnd.toString(), advanceAmountVnd: contract.advanceAmountVnd.toString(), journeyContent: contract.journeyContent, otherAgreements: contract.otherAgreements ?? "", guideName: contract.guideName, headerTemplateId: contract.headerTemplateId ?? "", footerTemplateId: contract.footerTemplateId ?? "" }} /></div>;
  contract.guideGender = contract.guideGender.toUpperCase() === "MALE" ? "Nam" : contract.guideGender.toUpperCase() === "FEMALE" ? "Nữ" : contract.guideGender;
  contract.journeyContent = [contract.journeyContent, contract.pickupDropoffContent ? `Đón/Trả khách:\n${contract.pickupDropoffContent}` : null, contract.otherAgreements ? `Các thỏa thuận khác: ${contract.otherAgreements}` : null].filter(Boolean).join("\n");
  const docx = { contractNumber: contract.contractNumber, headingDate: `${contract.signingPlace}, ngày ${displayDate(contract.contractDate)}`, legalBases: contract.legalBases, companyName: contract.companyName, companyAddress: contract.companyAddress, companyTaxCode: contract.companyTaxCode, signerName: contract.signerName, signerTitle: contract.signerTitle, guideName: contract.guideName, guideGender: contract.guideGender, guideIdentityNumber: contract.guideIdentityNumber, guidePhone: contract.guidePhone, guideAccountName: contract.guideAccountName, guideBankAccountNumber: contract.guideBankAccountNumber, guideBankName: contract.guideBankName, servicePeriod: `từ ngày ${displayDate(contract.serviceStartDate)} đến ngày ${displayDate(contract.serviceEndDate)}`, journeyContent: contract.journeyContent, dailyRate: money(contract.dailyRateVnd), workingDayCount: contract.workingDayCount, total: money(contract.totalAmountVnd), advance: money(contract.advanceAmountVnd), article4: contract.article4, article5: contract.article5, article6: contract.article6, article7: contract.article7, copies: contract.contractCopies, headerImageUrl: contract.headerImageStoredName ? `/api/tour-guide-contract-assets/${contract.id}/header` : null, headerContent: contract.headerContent, footerImageUrl: contract.footerImageStoredName ? `/api/tour-guide-contract-assets/${contract.id}/footer` : null, footerContent: contract.footerContent };
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/quick/${id}/guide-contracts`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Danh sách hợp đồng</Link><div className="flex flex-wrap gap-2"><TourGuideContractDocxButton contract={docx} /><TourGuideContractPrintButton />{canEdit && <WorkCaseActionForm action={regenerateTourGuideContract.bind(null, contract.id)}><Button type="submit" variant="outline"><RefreshCw />Gen theo mẫu mới</Button></WorkCaseActionForm>}{canEdit && <Button nativeButton={false} render={<Link href={`/quick/${id}/guide-contracts/${contract.id}?edit=1`} />}><Pencil />Sửa</Button>}</div></div><Card className="guide-contract-print mx-auto max-w-4xl bg-white p-8 text-sm leading-6 text-black sm:p-12"><TourGuideContractDocument contract={contract} /></Card></div>;
}
