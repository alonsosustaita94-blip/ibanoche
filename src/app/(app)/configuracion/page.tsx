import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, CreditCard, FlaskConical, Lock, PlugZap, Tags } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { formatDateTime, localDateKey, TIMEZONE, zonedDateTime, addDays } from "@/lib/dates";
import { bpsToPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { EMILIA_SCOPES } from "@/lib/validation/settings";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { GeneralForm } from "./general-form";
import { BranchesPanel } from "./branches";
import { ScheduleEditor } from "./schedule-editor";
import { UsersPanel } from "./users";
import { RolesMatrix } from "./roles-matrix";
import { PromotionsPanel } from "./promotions";
import { NotificationsForm, PaymentsForm } from "./toggle-forms";
import { ApiKeysPanel } from "./api-keys";
import { AuditFilters, AuditTable } from "./audit";

export const metadata: Metadata = { title: "Configuración" };

const TABS: { key: string; label: string; permission: Permission }[] = [
  { key: "general", label: "Información general", permission: "settings.view" },
  { key: "sucursales", label: "Sucursales", permission: "settings.view" },
  { key: "horarios", label: "Horarios", permission: "settings.view" },
  { key: "usuarios", label: "Usuarios y roles", permission: "users.manage" },
  { key: "estudios", label: "Estudios y tarifas", permission: "settings.view" },
  { key: "descuentos", label: "Descuentos", permission: "settings.view" },
  { key: "pagos", label: "Métodos de pago", permission: "settings.view" },
  { key: "integraciones", label: "Integraciones", permission: "settings.view" },
  { key: "notificaciones", label: "Notificaciones", permission: "settings.view" },
  { key: "auditoria", label: "Auditoría", permission: "audit.view" },
];

type SP = {
  tab?: string;
  branch?: string;
  page?: string;
  entity?: string;
  action?: string;
  user?: string;
  actor?: string;
  from?: string;
  to?: string;
};

async function setting<T>(key: string): Promise<Partial<T>> {
  const s = await db.systemSetting.findUnique({ where: { key } });
  return (s?.value ?? {}) as Partial<T>;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("settings.view");
  const sp = await searchParams;
  const tabs = TABS.filter((t) => can(user, t.permission));
  const tab = tabs.find((t) => t.key === sp.tab)?.key ?? "general";
  const canManage = can(user, "settings.manage");

  return (
    <div className="grid gap-6">
      <PageHeader title="Configuración" description="Sucursales, usuarios, permisos, reglas de negocio e integraciones." />
      {!canManage ? (
        <p className="flex items-center gap-2 rounded-lg bg-brand-ice px-4 py-2 text-sm text-brand-blue">
          <Lock className="h-4 w-4" /> Tienes acceso de consulta. Solo un administrador puede modificar la configuración.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Secciones de configuración" className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin lg:flex-col lg:overflow-visible">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/configuracion?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 font-display text-[0.8rem] font-semibold transition-colors",
                tab === t.key ? "bg-card text-brand-blue shadow-card" : "text-brand-text hover:bg-card/70 hover:text-brand-blue",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">
          <TabContent tab={tab} sp={sp} canManage={canManage} userId={user.id} canAudit={can(user, "audit.view")} />
        </div>
      </div>
    </div>
  );
}

async function TabContent({ tab, sp, canManage, userId, canAudit }: { tab: string; sp: SP; canManage: boolean; userId: string; canAudit: boolean }) {
  switch (tab) {
    case "general": {
      const [general, quotes, appts] = await Promise.all([
        setting<{ businessName: string; currency: string }>("general"),
        setting<{ validityDays: number }>("quotes"),
        setting<{ minAdvanceMinutes: number; maxDaysAhead: number }>("appointments"),
      ]);
      return (
        <GeneralForm
          disabled={!canManage}
          values={{
            businessName: general.businessName ?? "IBANOCHE — Laboratorio de Análisis Clínicos",
            timezone: TIMEZONE,
            currency: general.currency ?? "MXN",
            quoteValidityDays: quotes.validityDays ?? 15,
            minAdvanceMinutes: appts.minAdvanceMinutes ?? 60,
            maxDaysAhead: appts.maxDaysAhead ?? 60,
          }}
        />
      );
    }
    case "sucursales": {
      const branches = await db.branch.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { users: true, patients: true } } },
      });
      return <BranchesPanel disabled={!canManage} branches={branches.map((b) => ({ id: b.id, code: b.code, name: b.name, address: b.address, phone: b.phone, active: b.active, isDemo: b.isDemo, users: b._count.users, patients: b._count.patients }))} />;
    }
    case "horarios": {
      const branches = await db.branch.findMany({ orderBy: { name: "asc" }, include: { schedules: true } });
      return (
        <ScheduleEditor
          disabled={!canManage}
          initialBranchId={branches.some((b) => b.id === sp.branch) ? sp.branch! : branches[0]?.id}
          branches={branches.map((b) => ({
            id: b.id,
            name: b.name,
            schedules: b.schedules.map((s) => ({ weekday: s.weekday, active: s.active, opensAt: s.opensAt, closesAt: s.closesAt, slotMinutes: s.slotMinutes, capacity: s.capacity, homeService: s.homeService })),
          }))}
        />
      );
    }
    case "usuarios": {
      const [users, roles, branches] = await Promise.all([
        db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { role: true, branches: { include: { branch: true } } } }),
        db.role.findMany({ orderBy: { name: "asc" } }),
        db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ]);
      const roleOrder = ["ADMIN", "SUPERVISOR", "RECEPTION", "CASHIER", "SALES", "READ_ONLY"];
      return (
        <div className="grid grid-cols-1 gap-6">
          <UsersPanel
            currentUserId={userId}
            branches={branches}
            roles={roles.map((r) => ({ key: r.key, name: r.name }))}
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              roleKey: u.role.key,
              roleName: u.role.name,
              active: u.active,
              isDemo: u.isDemo,
              lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
              branchIds: u.branches.map((b) => b.branchId),
              branchNames: u.branches.map((b) => b.branch.name),
            }))}
          />
          <RolesMatrix
            permissions={Object.entries(PERMISSIONS).map(([key, label]) => ({ key, label }))}
            roles={[...roles]
              .sort((a, b) => roleOrder.indexOf(a.key) - roleOrder.indexOf(b.key))
              .map((r) => ({ key: r.key, name: r.name, description: r.description, permissions: r.permissions, maxDiscountBps: r.maxDiscountBps }))}
          />
        </div>
      );
    }
    case "estudios": {
      const [active, inactive, categories, pendingInstructions] = await Promise.all([
        db.study.count({ where: { active: true } }),
        db.study.count({ where: { active: false } }),
        db.studyCategory.count(),
        db.study.count({ where: { active: true, instructionsApproved: false } }),
      ]);
      return (
        <Card>
          <CardHeader>
            <CardTitle>Estudios y tarifas</CardTitle>
            <CardDescription>El catálogo, los precios públicos y los costos internos se administran en el módulo Catálogo de estudios.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Estudios activos", active],
                ["Inactivos", inactive],
                ["Categorías", categories],
                ["Indicaciones por aprobar", pendingInstructions],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/60 p-3">
                  <p className="font-display text-xl font-bold text-brand-ink tabular">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <ul className="grid gap-2 text-sm text-brand-text">
              <li className="flex gap-2"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-brand-turquoise" /> Las tarifas se versionan: un cambio de precio cierra la tarifa vigente y crea una nueva, sin alterar cotizaciones previas.</li>
              <li className="flex gap-2"><Tags className="mt-0.5 h-4 w-4 shrink-0 text-brand-turquoise" /> El costo interno solo es visible para roles con el permiso “Ver costo interno”.</li>
            </ul>
            <Link href="/catalogo" className={cn(buttonVariants(), "w-fit")}>
              Abrir catálogo de estudios <ArrowRight />
            </Link>
          </CardContent>
        </Card>
      );
    }
    case "descuentos": {
      const [promotions, roles] = await Promise.all([db.promotion.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] }), db.role.findMany({ orderBy: { maxDiscountBps: "desc" } })]);
      return (
        <PromotionsPanel
          disabled={!canManage}
          promotions={promotions.map((p) => ({
            id: p.id,
            name: p.name,
            discountBps: p.discountBps,
            active: p.active,
            validFrom: p.validFrom ? localDateKey(p.validFrom) : null,
            validTo: p.validTo ? localDateKey(p.validTo) : null,
          }))}
          roles={roles.map((r) => ({ name: r.name, max: bpsToPercent(r.maxDiscountBps) }))}
        />
      );
    }
    case "pagos": {
      const payments = await setting<{ CASH: boolean; CARD: boolean; TRANSFER: boolean }>("payments");
      return (
        <div className="grid gap-4">
          <PaymentsForm disabled={!canManage} values={{ CASH: payments.CASH ?? true, CARD: payments.CARD ?? true, TRANSFER: payments.TRANSFER ?? true }} />
          <Card className="flex items-start gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-amberSoft text-brand-amber">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="flex flex-wrap items-center gap-2 font-display text-sm font-bold text-brand-ink">
                Pasarela de pago <Badge tone="amber">No configurada</Badge>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Los cobros con tarjeta y transferencia se registran manualmente (terminal o comprobante bancario). No se procesan pagos en línea hasta configurar las credenciales de un proveedor.
              </p>
            </div>
          </Card>
        </div>
      );
    }
    case "integraciones": {
      const [clients, branches] = await Promise.all([db.apiClient.findMany({ orderBy: { createdAt: "desc" } }), db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })]);
      const agentConnected = Boolean(process.env.EMILIA_AGENT_URL);
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { name: "Agente de Emilia IA", env: "EMILIA_AGENT_URL", connected: agentConnected, text: "Servicio de IA que conversa con pacientes y usa la API del CRM." },
              { name: "WhatsApp Business", env: "WHATSAPP_API_TOKEN", connected: Boolean(process.env.WHATSAPP_API_TOKEN), text: "Canal de mensajería para Emilia y recepción." },
            ].map((i) => (
              <Card key={i.name} className="flex items-start gap-4 p-5">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", i.connected ? "bg-brand-greenSoft text-brand-green" : "bg-muted text-muted-foreground")}>
                  <PlugZap className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-display text-sm font-bold text-brand-ink">
                    {i.name} <Badge tone={i.connected ? "green" : "gray"}>{i.connected ? "Conectado" : "No conectado"}</Badge>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{i.text}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Variable de entorno: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-brand-ink">{i.env}</code>
                  </p>
                </div>
              </Card>
            ))}
          </div>
          <ApiKeysPanel
            disabled={!canManage}
            scopes={Object.entries(EMILIA_SCOPES).map(([key, label]) => ({ key, label }))}
            branches={branches}
            clients={clients.map((c) => ({
              id: c.id,
              name: c.name,
              keyPrefix: c.keyPrefix,
              scopes: c.scopes,
              branchName: branches.find((b) => b.id === c.branchId)?.name ?? null,
              lastUsedAt: c.lastUsedAt ? formatDateTime(c.lastUsedAt) : null,
              createdAt: formatDateTime(c.createdAt),
              active: c.active && !c.revokedAt,
            }))}
          />
        </div>
      );
    }
    case "notificaciones": {
      const n = await setting<{ appointmentReminders: boolean; quoteFollowUp: boolean; dailySummary: boolean }>("notifications");
      return <NotificationsForm disabled={!canManage} values={{ appointmentReminders: n.appointmentReminders ?? false, quoteFollowUp: n.quoteFollowUp ?? true, dailySummary: n.dailySummary ?? true }} />;
    }
    case "auditoria": {
      if (!canAudit) return null;
      const PAGE_SIZE = 25;
      const page = parsePage(sp.page);
      const validDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
      const from = validDate(sp.from);
      const to = validDate(sp.to);
      const where: Prisma.AuditLogWhereInput = {
        ...(sp.entity ? { entity: sp.entity } : {}),
        ...(sp.action ? { action: { contains: sp.action.trim().slice(0, 60), mode: "insensitive" } } : {}),
        ...(sp.user ? { userId: sp.user } : {}),
        ...(sp.actor === "USER" || sp.actor === "EMILIA" || sp.actor === "SYSTEM" ? { actorType: sp.actor } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: zonedDateTime(from, "00:00") } : {}), ...(to ? { lt: zonedDateTime(addDays(to, 1), "00:00") } : {}) } } : {}),
      };
      const [logs, total, entities, users] = await Promise.all([
        db.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        db.auditLog.count({ where }),
        db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
        db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ]);
      return (
        <Card>
          <CardHeader>
            <CardTitle>Auditoría</CardTitle>
            <CardDescription>Registro de cambios administrativos, accesos y acciones de Emilia. No se puede modificar.</CardDescription>
          </CardHeader>
          <AuditFilters entities={entities.map((e) => e.entity)} users={users} from={from ?? ""} to={to ?? ""} action={sp.action ?? ""} />
          <AuditTable
            logs={logs.map((l) => ({
              id: l.id,
              createdAt: formatDateTime(l.createdAt),
              actor: l.actorType === "USER" ? (l.user?.name ?? "Usuario eliminado") : l.actorType === "EMILIA" ? "Emilia (API)" : "Sistema",
              actorType: l.actorType,
              action: l.action,
              entity: l.entity,
              entityId: l.entityId,
              summary: l.summary,
              ip: l.ip,
              before: l.before ?? null,
              after: l.after ?? null,
            }))}
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/configuracion"
            params={{ tab: "auditoria", entity: sp.entity, action: sp.action, user: sp.user, actor: sp.actor, from, to }}
          />
        </Card>
      );
    }
    default:
      return null;
  }
}
