"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Building2, ChevronDown, LogOut, Menu, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { logoutAction, setActiveBranchAction } from "@/server/actions/auth";
import { markNotificationsReadAction } from "@/server/actions/notifications";
import { globalSearchAction, type SearchHit } from "@/server/actions/search";
import type { NavItem } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, NativeSelect } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand";
import { SidebarNav } from "./sidebar";

export type HeaderProps = {
  user: { name: string; email: string; roleName: string };
  branches: { id: string; name: string }[];
  activeBranchId: string | null;
  allowAll: boolean;
  nav: NavItem[];
  notifications: { id: string; title: string; body: string; level: string; link: string | null; createdAt: string; read: boolean }[];
};

function BranchSwitcher({ branches, activeBranchId, allowAll }: Pick<HeaderProps, "branches" | "activeBranchId" | "allowAll">) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="relative hidden items-center md:flex">
      <span className="sr-only">Sucursal activa</span>
      <Building2 className="pointer-events-none absolute left-3 h-4 w-4 text-brand-turquoise" aria-hidden />
      <NativeSelect
        className={cn("h-9 w-52 pl-9 text-xs font-semibold", pending && "opacity-60")}
        value={activeBranchId ?? ""}
        onChange={(e) =>
          start(async () => {
            const r = await setActiveBranchAction(e.target.value);
            if (!r.ok) toast.error(r.error);
            router.refresh();
          })
        }
      >
        {allowAll || branches.length > 1 ? <option value="">Todas mis sucursales</option> : null}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

const hitIcon: Record<SearchHit["type"], string> = {
  patient: "Paciente",
  study: "Estudio",
  quote: "Cotización",
  order: "Orden",
};

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onChange = (v: string) => {
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const r = await globalSearchAction(v);
      setLoading(false);
      setHits(r);
      setOpen(true);
    }, 250);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => hits.length && setOpen(true)}
            placeholder="Buscar pacientes, estudios, folios…"
            className="h-9 bg-muted/60 pl-9 pr-14"
            aria-label="Búsqueda global"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-card px-1.5 text-[0.65rem] text-muted-foreground sm:block">
            Ctrl K
          </kbd>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[min(92vw,28rem)] p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
        {loading ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Buscando…</p>
        ) : hits.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Sin resultados para “{q}”.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {hits.map((h) => (
              <li key={`${h.type}-${h.id}`}>
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    router.push(h.href);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand-ink">{h.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{h.subtitle}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-ice px-2 py-0.5 text-[0.65rem] font-semibold text-brand-blue">{hitIcon[h.type]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Notifications({ items }: { items: HeaderProps["notifications"] }) {
  const router = useRouter();
  const unread = items.filter((n) => !n.read).length;
  return (
    <DropdownMenu
      onOpenChange={async (o) => {
        if (!o && unread) {
          await markNotificationsReadAction();
          router.refresh();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}>
          <Bell className="h-[18px] w-[18px]" />
          {unread ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-coral px-1 text-[0.6rem] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem key={n.id} className="items-start" onSelect={() => n.link && router.push(n.link)}>
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  n.read ? "bg-transparent" : n.level === "warning" ? "bg-brand-coral" : n.level === "success" ? "bg-brand-green" : "bg-brand-turquoise",
                )}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-brand-ink">{n.title}</span>
                <span className="block text-xs text-muted-foreground">{n.body}</span>
                <span className="mt-0.5 block text-[0.65rem] text-muted-foreground/80">{formatDateTime(n.createdAt)}</span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ user, branches, activeBranchId, allowAll, nav, notifications }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex h-16 print:hidden items-center gap-3 border-b border-border/70 bg-card/95 px-4 backdrop-blur sm:px-6">
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-4">
          <DialogTitle className="sr-only">Menú</DialogTitle>
          <BrandMark />
          <SidebarNav items={nav} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Dialog>

      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>

      <BranchSwitcher branches={branches} activeBranchId={activeBranchId} allowAll={allowAll} />
      <Notifications items={notifications} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1 pr-2 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar name={user.name} />
            <span className="hidden min-w-0 md:block">
              <span className="block max-w-[10rem] truncate text-xs font-bold text-brand-ink">{user.name}</span>
              <span className="block text-[0.65rem] text-muted-foreground">{user.roleName}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <span className="block text-sm text-brand-ink">{user.name}</span>
            <span className="block font-normal">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/crm/perfil">
              <UserRound /> Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-brand-blush">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
