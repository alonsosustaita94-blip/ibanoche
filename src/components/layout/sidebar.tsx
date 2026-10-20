"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  Handshake,
  LayoutDashboard,
  MessageCircleHeart,
  Settings,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  FlaskConical,
  FileText,
  ClipboardList,
  Wallet,
  MessageCircleHeart,
  Target,
  Handshake,
  BarChart3,
  Settings,
};

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Módulos" className="grid gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-[0.82rem] font-semibold transition-colors",
              active ? "bg-brand-blue text-white shadow-sm" : "text-brand-text hover:bg-accent hover:text-brand-blue",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-brand-text/80 group-hover:text-brand-blue")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/70 bg-card lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" aria-label="Ir al dashboard">
          <BrandMark />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        <SidebarNav items={items} />
      </div>
      <div className="m-3 rounded-xl bg-gradient-to-br from-brand-ice to-brand-mint p-4">
        <p className="font-display text-xs font-bold text-brand-blue">Sistema administrativo</p>
        <p className="mt-1 text-[0.7rem] leading-snug text-brand-text">
          Este CRM no almacena resultados ni información clínica.
        </p>
      </div>
    </aside>
  );
}
