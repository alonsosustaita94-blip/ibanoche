import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ArrowLeft,
  Ban,
  Bot,
  CalendarClock,
  Check,
  FileText,
  Globe,
  MessageCircle,
  MessageCircleHeart,
  PlugZap,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatDate, formatDateTime, formatTime, localDateKey } from "@/lib/dates";
import { APPOINTMENT_STATUS, CONVERSATION_STATUS, OPPORTUNITY_STAGE, QUOTE_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { cn, fullName, normalizePhone, normalizeText } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConversationActions, ReplyForm } from "./conversation-actions";

export const metadata: Metadata = { title: "Emilia IA" };

type SP = { f?: string; q?: string; c?: string };

const TABS: { key: string; label: string; where: Prisma.ConversationWhereInput }[] = [
  { key: "todas", label: "Recientes", where: {} },
  { key: "pendientes", label: "Pendientes", where: { status: "PENDING" } },
  { key: "transferidas", label: "Transferidas", where: { status: "TRANSFERRED" } },
  { key: "emilia", label: "Con Emilia", where: { status: "OPEN" } },
  { key: "cerradas", label: "Cerradas", where: { status: "CLOSED" } },
];

const CAN = [
  "Buscar estudios del catálogo",
  "Consultar precios públicos autorizados",
  "Generar cotizaciones (sin descuentos)",
  "Consultar disponibilidad de horarios",
  "Registrar pacientes nuevos para agendar su cita",
  "Solicitar citas según las reglas de agenda",
  "Registrar prospectos comerciales",
  "Transferir la conversación a personal humano",
];

const CANNOT = [
  "Diagnosticar",
  "Interpretar resultados clínicos",
  "Recomendar medicamentos o tratamientos",
  "Consultar resultados clínicos",
  "Autorizar reembolsos",
  "Modificar precios",
  "Inventar promociones o descuentos",
];

const ENDPOINTS = [
  ["searchStudies", "studies.read"],
  ["getApprovedPrice", "prices.read"],
  ["createQuote", "quotes.create"],
  ["listBranches", "availability.read"],
  ["findOrCreatePatient", "patients.write"],
  ["checkAvailability", "availability.read"],
  ["createAppointment", "appointments.create"],
  ["createLead", "leads.create"],
  ["handoffToHuman", "handoff.create"],
] as const;

function shortTime(d: Date) {
  return localDateKey(d) === localDateKey(new Date()) ? formatTime(d) : formatDate(d).slice(0, 6);
}

function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  return channel === "WEBSITE" ? (
    <Globe className={cn("h-3.5 w-3.5 text-brand-blue", className)} aria-label="Sitio web" />
  ) : (
    <MessageCircle className={cn("h-3.5 w-3.5 text-brand-green", className)} aria-label="WhatsApp" />
  );
}

export default async function EmiliaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("emilia.view");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.f) ?? TABS[0];
  const scope: Prisma.ConversationWhereInput = { OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] };
  const connected = Boolean(process.env.EMILIA_AGENT_URL);

  const [rows, grouped, selected, emiliaLog] = await Promise.all([
    db.conversation.findMany({
      where: { ...scope, ...tab.where },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 }, assignedTo: true },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    }),
    db.conversation.groupBy({ by: ["status"], _count: true, where: scope }),
    sp.c
      ? db.conversation.findFirst({
          where: { id: sp.c, ...scope },
          include: {
            messages: { orderBy: { createdAt: "asc" }, include: { user: true } },
            assignedTo: true,
            branch: true,
            patient: {
              include: {
                quotes: { orderBy: { issuedAt: "desc" }, take: 4 },
                appointments: { where: { startsAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } }, orderBy: { startsAt: "asc" }, take: 4, include: { branch: true } },
              },
            },
          },
        })
      : null,
    db.auditLog.findMany({ where: { actorType: "EMILIA" }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const q = sp.q?.trim() ? normalizeText(sp.q) : "";
  const conversations = q ? rows.filter((c) => normalizeText(`${c.contactName} ${c.contactPhone ?? ""} ${c.intent ?? ""}`).includes(q)) : rows;
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  const total = grouped.reduce((a, g) => a + g._count, 0);

  const phone = selected ? normalizePhone(selected.contactPhone) : null;
  const opportunities = selected
    ? await db.opportunity.findMany({
        where: {
          branchId: { in: user.branchIds },
          OR: [...(selected.patientId ? [{ patientId: selected.patientId }] : []), ...(phone ? [{ prospectPhone: phone }] : []), { prospectName: selected.contactName }],
        },
        orderBy: { stageChangedAt: "desc" },
        take: 5,
      })
    : [];

  const canReply = can(user, "emilia.reply");
  const canOpp = can(user, "opportunities.manage");
  const [owners, branches, partners] = canOpp
    ? await Promise.all([
        db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        db.partner.findMany({ where: { OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] }, orderBy: { organization: "asc" }, select: { id: true, organization: true } }),
      ])
    : [[], [], []];

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ f: sp.f, q: sp.q, c: sp.c, ...patch }).filter(([, v]) => v) as [string, string][]);
    const qs = p.toString();
    return `/crm/emilia${qs ? `?${qs}` : ""}`;
  };
  const patientName = selected?.patient ? fullName(selected.patient) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        title="Emilia IA"
        description="Bandeja de conversaciones y centro de atención comercial."
        actions={
          <Badge tone={connected ? "green" : "amber"} dot>
            {connected ? "Emilia conectada" : "IA no conectada"}
          </Badge>
        }
      />

      {!connected ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-amber/30 bg-gradient-to-r from-brand-amberSoft to-card p-4 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-brand-amber shadow-sm">
            <PlugZap className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-display font-bold text-brand-ink">Emilia no está conectada</p>
            <p className="text-muted-foreground">
              La API para Emilia está lista, pero aún no hay un agente de IA enlazado. Las conversaciones de esta bandeja son <strong>simuladas</strong> para demostración y ninguna respuesta se genera automáticamente.
            </p>
          </div>
          <a href="#capacidades" className="shrink-0 text-sm font-semibold text-brand-blue hover:underline">
            Ver capacidades e integración
          </a>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_19rem]">
        {/* Bandeja */}
        <Card className={cn("flex min-h-[28rem] flex-col overflow-hidden lg:h-[calc(100dvh-15rem)] lg:min-h-[36rem]", selected && "hidden lg:flex")}>
          <div className="grid gap-3 border-b p-3">
            <SearchInput placeholder="Buscar contacto o intención" className="sm:max-w-none" />
            <nav aria-label="Filtrar conversaciones" className="-mx-1 flex gap-1 overflow-x-auto scrollbar-thin">
              {TABS.map((t) => {
                const n = t.key === "todas" ? total : counts[(t.where.status as string) ?? ""] ?? 0;
                const active = t.key === tab.key;
                return (
                  <Link
                    key={t.key}
                    href={hrefWith({ f: t.key === "todas" ? undefined : t.key, c: undefined })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-md px-2.5 py-1 font-display text-[0.7rem] font-semibold transition-colors",
                      active ? "bg-brand-blue text-white" : "text-muted-foreground hover:bg-accent hover:text-brand-blue",
                    )}
                  >
                    {t.label} <span className="tabular opacity-80">{n}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          {conversations.length === 0 ? (
            <EmptyState icon={MessageCircleHeart} title="Sin conversaciones" description="No hay conversaciones con este filtro." />
          ) : (
            <ul className="flex-1 overflow-y-auto scrollbar-thin">
              {conversations.map((c) => {
                const last = c.messages[0];
                const active = c.id === selected?.id;
                const attention = c.status === "PENDING" || c.status === "TRANSFERRED";
                return (
                  <li key={c.id}>
                    <Link
                      href={hrefWith({ c: c.id })}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex gap-3 border-b border-l-[3px] px-3 py-3 transition-colors hover:bg-muted/60",
                        active ? "border-l-brand-turquoise bg-brand-mint/50" : "border-l-transparent",
                      )}
                    >
                      <span className="relative shrink-0">
                        <Avatar name={c.contactName} className="h-9 w-9" />
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card p-0.5">
                          <ChannelIcon channel={c.channel} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate text-sm text-brand-ink", attention ? "font-bold" : "font-semibold")}>{c.contactName}</span>
                          <span className="shrink-0 text-[0.65rem] text-muted-foreground tabular">{shortTime(c.lastMessageAt)}</span>
                        </span>
                        <span className={cn("mt-0.5 block truncate text-xs", attention ? "text-brand-ink" : "text-muted-foreground")}>
                          {last ? `${last.sender === "EMILIA" ? "Emilia: " : last.sender === "AGENT" ? "Tú: " : ""}${last.body}` : "Sin mensajes"}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1">
                          <StatusBadge value={c.status} map={CONVERSATION_STATUS} />
                          {c.isSimulated ? <Badge tone="gray">Simulada</Badge> : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Conversación */}
        <Card className={cn("flex min-h-[32rem] min-w-0 flex-col overflow-hidden lg:h-[calc(100dvh-15rem)] lg:min-h-[36rem]", !selected && "hidden lg:flex")}>
          {selected ? (
            <>
              <div className="grid gap-3 border-b p-4">
                <div className="flex items-start gap-3">
                  <Link href={hrefWith({ c: undefined })} className="mt-1 rounded p-1 text-muted-foreground hover:bg-muted lg:hidden" aria-label="Volver a la bandeja">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Avatar name={selected.contactName} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-brand-ink">
                      {selected.contactName}
                      {selected.isSimulated ? <Badge tone="gray">Simulada</Badge> : null}
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ChannelIcon channel={selected.channel} /> {selected.channel === "WEBSITE" ? "Sitio web" : "WhatsApp"}
                      </span>
                      {selected.intent ? <span>Intención: {selected.intent}</span> : null}
                      <span>{selected.assignedTo ? `Atiende: ${selected.assignedTo.name}` : "Sin asignar"}</span>
                    </p>
                  </div>
                  <StatusBadge value={selected.status} map={CONVERSATION_STATUS} />
                </div>
                {selected.handoffReason ? (
                  <p className="rounded-lg bg-brand-ice px-3 py-2 text-xs text-brand-blue">Motivo de transferencia: {selected.handoffReason}</p>
                ) : null}
                <ConversationActions
                  conversationId={selected.id}
                  status={selected.status}
                  assignedToMe={selected.assignedToId === user.id}
                  patient={selected.patient ? { id: selected.patient.id, name: patientName! } : null}
                  perms={{ reply: canReply, quotes: can(user, "quotes.manage"), appointments: can(user, "appointments.manage"), opportunities: canOpp }}
                  opportunity={{
                    title: selected.intent ? `Interés: ${selected.intent}` : `Seguimiento de ${selected.contactName}`,
                    prospectName: patientName ?? selected.contactName,
                    prospectPhone: selected.contactPhone,
                    clientType: "PATIENT",
                    ownerId: user.id,
                    branchId: selected.branchId ?? branches[0]?.id,
                    patientId: selected.patientId,
                    notes: `Registrada desde la conversación con ${selected.contactName}.`,
                  }}
                  lists={{ owners, branches, partners: partners.map((p) => ({ id: p.id, name: p.organization })) }}
                />
              </div>
              <div className="flex flex-1 flex-col-reverse overflow-y-auto bg-muted/30 px-4 py-4 scrollbar-thin">
                <ol className="grid gap-3">
                  {selected.messages.map((m) =>
                    m.sender === "SYSTEM" ? (
                      <li key={m.id} className="mx-auto max-w-md rounded-full bg-card px-3 py-1 text-center text-[0.7rem] text-muted-foreground shadow-sm">
                        {m.body} · {formatTime(m.createdAt)}
                      </li>
                    ) : (
                      <li key={m.id} className={cn("flex", m.sender === "CONTACT" ? "justify-start" : "justify-end")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%]",
                            m.sender === "CONTACT" && "rounded-bl-md bg-card text-brand-ink",
                            m.sender === "EMILIA" && "rounded-br-md border border-brand-turquoise/30 bg-brand-mint text-brand-ink",
                            m.sender === "AGENT" && "rounded-br-md bg-brand-blue text-white",
                          )}
                        >
                          <p className="mb-0.5 flex items-center gap-1 text-[0.65rem] font-semibold opacity-75">
                            {m.sender === "EMILIA" ? <Bot className="h-3 w-3" /> : m.sender === "AGENT" ? <UserRound className="h-3 w-3" /> : null}
                            {m.sender === "CONTACT" ? selected.contactName : m.sender === "EMILIA" ? "Emilia" : (m.user?.name ?? "Personal")}
                          </p>
                          <p className="whitespace-pre-line">{m.body}</p>
                          <p className="mt-1 text-right text-[0.6rem] opacity-70 tabular">{formatDateTime(m.createdAt)}</p>
                        </div>
                      </li>
                    ),
                  )}
                </ol>
              </div>
              {canReply ? <ReplyForm conversationId={selected.id} closed={selected.status === "CLOSED"} /> : null}
            </>
          ) : (
            <EmptyState className="m-auto" icon={Sparkles} title="Selecciona una conversación" description="Revisa el historial, toma la conversación o registra una cotización, cita u oportunidad." />
          )}
        </Card>

        {/* Ficha */}
        <div className={cn("grid content-start gap-4 lg:col-span-2 xl:col-span-1 xl:h-[calc(100dvh-15rem)] xl:min-h-[36rem] xl:overflow-y-auto xl:scrollbar-thin", !selected && "hidden xl:grid")}>
          {selected ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selected.patient ? "Ficha del paciente" : "Prospecto"}</CardTitle>
                  <CardDescription>Datos administrativos</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2.5 text-sm">
                  {selected.patient ? (
                    <>
                      <Link href={`/crm/pacientes/${selected.patient.id}`} className="font-semibold text-brand-blue hover:underline">
                        {patientName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {selected.patient.folio} · {selected.patient.phone ?? "sin teléfono"}
                      </p>
                      {selected.patient.contactConsent ? (
                        <p className="flex items-center gap-2 rounded-lg bg-brand-greenSoft px-2.5 py-1.5 text-xs text-brand-green">
                          <ShieldCheck className="h-3.5 w-3.5" /> Autoriza contacto
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 rounded-lg bg-brand-blush px-2.5 py-1.5 text-xs text-[#c23444]">
                          <ShieldOff className="h-3.5 w-3.5" /> Sin autorización de contacto
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-brand-ink">{selected.contactName}</p>
                      <p className="text-xs text-muted-foreground">{selected.contactPhone ?? "Sin teléfono"}</p>
                      <p className="rounded-lg bg-muted px-2.5 py-2 text-xs text-muted-foreground">Sin paciente vinculado. Vincúlalo para crear cotizaciones o citas a su nombre.</p>
                    </>
                  )}
                  {selected.branch ? <p className="text-xs text-muted-foreground">Sucursal: {selected.branch.name}</p> : null}
                </CardContent>
              </Card>

              {selected.patient ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand-blue" /> Cotizaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selected.patient.quotes.length ? (
                        <ul className="grid gap-2">
                          {selected.patient.quotes.map((q2) => (
                            <li key={q2.id} className="flex items-center justify-between gap-2 text-sm">
                              <Link href={`/crm/cotizaciones/${q2.id}`} className="font-semibold text-brand-blue hover:underline">
                                {q2.folio.replace(/^COT-\d{4}-/, "COT-")}
                              </Link>
                              <span className="flex items-center gap-2">
                                <span className="tabular">{formatMoney(q2.totalCents)}</span>
                                <StatusBadge value={q2.status} map={QUOTE_STATUS} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin cotizaciones.</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-brand-blue" /> Próximas citas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selected.patient.appointments.length ? (
                        <ul className="grid gap-2">
                          {selected.patient.appointments.map((a) => (
                            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="min-w-0">
                                <span className="block font-semibold text-brand-ink">{formatDateTime(a.startsAt)}</span>
                                <span className="block truncate text-xs text-muted-foreground">{a.branch.name}</span>
                              </span>
                              <StatusBadge value={a.status} map={APPOINTMENT_STATUS} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin citas próximas.</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand-blue" /> Oportunidades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunities.length ? (
                    <ul className="grid gap-2">
                      {opportunities.map((o) => (
                        <li key={o.id} className="flex items-start justify-between gap-2 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-brand-ink">{o.title}</span>
                            <span className="block text-xs text-muted-foreground tabular">{formatMoney(o.estimatedCents)}</span>
                          </span>
                          <StatusBadge value={o.stage} map={OPPORTUNITY_STAGE} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin oportunidades asociadas.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-5 text-sm text-muted-foreground">Selecciona una conversación para ver la ficha administrativa.</Card>
          )}
        </div>
      </div>

      {/* Capacidades y restricciones */}
      <section id="capacidades" aria-labelledby="cap-title" className="grid scroll-mt-24 gap-4">
        <h2 id="cap-title" className="font-display text-lg font-bold text-brand-ink">
          Capacidades y restricciones
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-green">Emilia puede</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm">
                {CAN.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-[#c23444]">Emilia no puede</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm">
                {CANNOT.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Ban className="mt-0.5 h-4 w-4 shrink-0 text-brand-coral" /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Estas acciones no existen en la API: el servidor no las expone.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>API para Emilia</CardTitle>
              <CardDescription>
                <code className="text-[0.7rem]">POST /api/emilia/&lt;acción&gt;</code> con llave Bearer y alcances mínimos. Documentación en <code className="text-[0.7rem]">docs/emilia-api.md</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1.5 text-xs">
                {ENDPOINTS.map(([a, scope]) => (
                  <li key={a} className="flex items-center justify-between gap-2">
                    <code className="font-semibold text-brand-blue">{a}</code>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">{scope}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente de la API</CardTitle>
            <CardDescription>Últimas 10 acciones realizadas con la llave de Emilia (auditoría).</CardDescription>
          </CardHeader>
          <CardContent>
            {emiliaLog.length ? (
              <ul className="grid gap-2 text-sm">
                {emiliaLog.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                    <code className="text-xs font-semibold text-brand-blue">{l.action}</code>
                    <span className="text-xs text-muted-foreground">
                      {l.summary ?? ""} · {formatDateTime(l.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividad registrada de la API.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
