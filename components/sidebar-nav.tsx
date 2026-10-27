"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Building2,
  ChevronDown,
  Database,
  ContactRound,
  Files,
  History,
  ListChecks,
  Newspaper,
  Package,
  Plane,
  ShieldCheck,
  Tags,
  UserRound,
  Zap,
  LayoutDashboard,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavCollapsibleItem = {
  label: string;
  icon: LucideIcon;
  children: { href: string; label: string }[];
};

const mainItems: NavItem[] = [

 
  { href: "/leads", label: "Lead", icon: ContactRound },
  { href: "/b2b-leads", label: "Lead B2B", icon: BriefcaseBusiness },
  { href: "/quick", label: "Tạo nhanh", icon: Zap },
  { href: "/leads/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads/report", label: "Báo cáo Lead", icon: FileText },
  { href: "/performance", label: "Năng suất", icon: ChartNoAxesCombined },
];

const crmItems: NavCollapsibleItem = {
  label: "Dữ liệu CRM",
  icon: Database,
  children: [
    { href: "/work", label: "Hồ sơ việc" },
    { href: "/customers", label: "CRM khách hàng" },
    { href: "/customers/follow-ups", label: "Cần chăm sóc" },
    { href: "/customers/classification", label: "Phân nhóm CRM" },
    { href: "/customers/reports", label: "Báo cáo CRM" },
    { href: "/departments", label: "Phòng ban" },
    { href: "/products", label: "Tour & dịch vụ" },
    { href: "/profile", label: "Tài khoản" },
    { href: "/tasks", label: "Công việc" },
    { href: "/news", label: "Bảng tin" },
    { href: "/files", label: "Tài liệu" },
  ],
};

const adminItems: NavItem[] = [
  { href: "/admin/activity", label: "Hoạt động", icon: History },
  { href: "/admin/users", label: "Người dùng", icon: ShieldCheck },
  { href: "/admin/access-control", label: "Vai trò và quyền", icon: ShieldCheck },
  { href: "/admin/resource-permissions", label: "Quyền tài nguyên", icon: ShieldCheck },
  { href: "/admin/lead-fields", label: "Quyền cột Lead", icon: ShieldCheck },
  { href: "/admin/departments", label: "Quản lý phòng ban", icon: Building2 },
];

const masterData: NavCollapsibleItem = {
  label: "Dữ liệu nền",
  icon: Database,
  children: [
    { href: "/admin/customers", label: "Khách hàng" },
    { href: "/admin/suppliers", label: "Nhà cung cấp" },
    { href: "/admin/supplier-types", label: "Loại nhà cung cấp" },
    { href: "/admin/tour-guides", label: "Hướng dẫn viên" },
    { href: "/admin/channels", label: "Kênh và phân loại" },
    { href: "/admin/products", label: "Tour và dịch vụ" },
    { href: "/admin/document-templates", label: "Mẫu tài liệu" },
    { href: "/admin/template-builder", label: "Template Builder (thử nghiệm)" },
    { href: "/admin/template-builder/data-contracts", label: "Data Contracts" },
    { href: "/admin/itinerary-settings", label: "Itinerary Information" },
    { href: "/admin/invoice-settings", label: "Invoice Settings" },
    { href: "/admin/tour-guide-contract-settings", label: "Hợp đồng hướng dẫn viên" },
  ],
};

const isPathActive = (pathname: string, href: string) =>
  pathname === href || (pathname.startsWith(`${href}/`) && !(href === "/customers" && ["/customers/follow-ups", "/customers/classification", "/customers/reports"].some((route) => pathname.startsWith(route))));

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5 font-semibold text-slate-900">
      <span className="flex size-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
        <Plane className="size-4" />
      </span>
      LP Travel
    </Link>
  );
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isPathActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600")}
      />
      {item.label}
    </Link>
  );
}

function NavCollapsible({ item, onNavigate }: { item: NavCollapsibleItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const hasActiveChild = item.children.some((c) => isPathActive(pathname, c.href));
  const [manuallyOpen, setManuallyOpen] = useState<boolean | null>(null);
  const open = hasActiveChild || manuallyOpen === true;
  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setManuallyOpen((o) => !(o ?? hasActiveChild))}
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActiveChild ? "text-sky-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            hasActiveChild ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600",
          )}
        />
        {item.label}
        <ChevronDown className={cn("ml-auto size-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
          {item.children.map((child) => {
            const active = isPathActive(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sky-50 font-medium text-sky-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Brand onClick={onNavigate} />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="space-y-1">
          <NavCollapsible item={crmItems} onNavigate={onNavigate} />
        </div>

        {isAdmin && (
          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Quản trị</p>
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onNavigate} />
            ))}
            <NavCollapsible item={masterData} onNavigate={onNavigate} />
          </div>
        )}
      </nav>
    </div>
  );
}
