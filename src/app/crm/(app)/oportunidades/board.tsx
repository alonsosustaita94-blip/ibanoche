"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarClock, GripVertical, Pencil } from "lucide-react";
import { toast } from "sonner";
import { moveOpportunityAction } from "@/server/actions/opportunities";
import { canMoveOpportunity } from "@/server/services/order-rules";
import { CLIENT_TYPE, OPPORTUNITY_STAGE } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { FormField } from "@/components/shared/form-field";
import { OpportunityFormDialog, type Option, type OpportunityFormValues } from "./opportunity-form";

export type BoardItem = {
  id: string;
  title: string;
  prospectName: string;
  clientType: string;
  estimatedCents: number;
  stage: string;
  position: number;
  ownerName: string | null;
  nextFollowUpAt: string | null; // ISO
  nextFollowUpLabel: string | null;
  lostReason: string | null;
  form: OpportunityFormValues;
};

const STAGES = ["PROSPECT", "CONTACTED", "QUOTED", "FOLLOW_UP", "WON", "LOST"] as const;

const columnTone: Record<string, string> = {
  PROSPECT: "border-t-[#9AA8BC]",
  CONTACTED: "border-t-brand-blue",
  QUOTED: "border-t-brand-turquoise",
  FOLLOW_UP: "border-t-brand-amber",
  WON: "border-t-brand-green",
  LOST: "border-t-brand-coral",
};

// Primero el puntero; si el teclado mueve la tarjeta, la intersección de rectángulos.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

type CardProps = {
  item: BoardItem;
  canManage: boolean;
  overlay?: boolean;
  onMove: (id: string, stage: string) => void;
  lists: { owners: Option[]; branches: Option[]; partners: Option[] };
};

/** Tarjeta arrastrable. */
function DraggableCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.item.id, disabled: !props.canManage });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn("min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isDragging && "opacity-40")} aria-roledescription="Oportunidad arrastrable">
      <CardBody {...props} />
    </div>
  );
}

function CardBody({ item, canManage, overlay, onMove, lists }: CardProps) {
  const overdue = item.nextFollowUpAt && new Date(item.nextFollowUpAt) < new Date() && !["WON", "LOST"].includes(item.stage);
  return (
    <article
      className={cn("group relative rounded-lg border bg-card p-3 shadow-sm transition", canManage && "cursor-grab active:cursor-grabbing", overlay && "rotate-1 shadow-pop")}
      aria-label={`${item.title}, ${OPPORTUNITY_STAGE[item.stage]?.label}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-display text-[0.82rem] font-bold leading-snug text-brand-ink">{item.title}</h3>
        {canManage && !overlay ? (
          <span className="flex shrink-0 items-center" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <OpportunityFormDialog
              trigger={
                <button type="button" className="rounded p-1 text-muted-foreground opacity-70 hover:bg-muted hover:text-brand-blue group-hover:opacity-100" aria-label={`Editar ${item.title}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              }
              initial={item.form}
              {...lists}
            />
          </span>
        ) : canManage ? (
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.prospectName}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Badge tone="gray">{CLIENT_TYPE[item.clientType] ?? item.clientType}</Badge>
        <span className="font-display text-sm font-bold text-brand-ink tabular">{formatMoney(item.estimatedCents)}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t pt-2">
        {item.ownerName ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <Avatar name={item.ownerName} className="h-5 w-5 text-[0.55rem]" />
            <span className="truncate">{item.ownerName.replace(" (demo)", "")}</span>
          </span>
        ) : (
          <span className="text-[0.7rem] text-muted-foreground">Sin responsable</span>
        )}
        {item.nextFollowUpLabel && !["WON", "LOST"].includes(item.stage) ? (
          <span className={cn("flex shrink-0 items-center gap-1 text-[0.7rem] font-semibold", overdue ? "text-brand-coral" : "text-brand-text")} title={overdue ? "Seguimiento vencido" : "Próximo seguimiento"}>
            <CalendarClock className="h-3 w-3" /> {item.nextFollowUpLabel}
          </span>
        ) : null}
      </div>
      {item.stage === "LOST" && item.lostReason ? <p className="mt-2 rounded bg-brand-blush px-2 py-1 text-[0.7rem] text-[#c23444]">{item.lostReason}</p> : null}
      {canManage && !overlay ? (
        <label className="mt-2 block sm:hidden" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <span className="sr-only">Mover a otra etapa</span>
          <NativeSelect className="h-8 text-xs" value={item.stage} onChange={(e) => onMove(item.id, e.target.value)}>
            {STAGES.map((s) => (
              <option key={s} value={s} disabled={!canMoveOpportunity(item.stage, s)}>
                {OPPORTUNITY_STAGE[s].label}
              </option>
            ))}
          </NativeSelect>
        </label>
      ) : null}
    </article>
  );
}

function Column({ stage, items, children }: { stage: string; items: BoardItem[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = items.reduce((a, i) => a + i.estimatedCents, 0);
  return (
    <section
      ref={setNodeRef}
      aria-label={OPPORTUNITY_STAGE[stage].label}
      className={cn(
        "flex w-[16rem] shrink-0 snap-start flex-col rounded-xl border border-t-4 bg-muted/50 transition-colors 2xl:w-auto 2xl:min-w-0",
        columnTone[stage],
        isOver && "bg-brand-ice ring-2 ring-brand-turquoise/40",
      )}
    >
      <header className="px-3 pb-2 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-brand-ink">{OPPORTUNITY_STAGE[stage].label}</h2>
          <span className="rounded-full bg-card px-2 py-0.5 text-[0.7rem] font-bold text-brand-text tabular">{items.length}</span>
        </div>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground tabular">{formatMoney(total)}</p>
      </header>
      <div className="grid min-h-24 grid-cols-[minmax(0,1fr)] content-start gap-2 px-2 pb-3">{children}</div>
    </section>
  );
}

export function OpportunityBoard({
  items: initial,
  canManage,
  owners,
  branches,
  partners,
}: {
  items: BoardItem[];
  canManage: boolean;
  owners: Option[];
  branches: Option[];
  partners: Option[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lost, setLost] = useState<{ id: string; reason: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const byStage = useMemo(() => {
    const m = new Map<string, BoardItem[]>(STAGES.map((s) => [s, []]));
    for (const it of items) m.get(it.stage)?.push(it);
    for (const list of m.values()) list.sort((a, b) => a.position - b.position);
    return m;
  }, [items]);
  const lists = { owners, branches, partners };

  const move = (id: string, stage: string, lostReason?: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.stage === stage) return;
    if (!canMoveOpportunity(item.stage, stage)) {
      toast.error(["WON", "LOST"].includes(item.stage) ? "Una oportunidad cerrada solo puede reabrirse a En seguimiento." : "Ese cambio de etapa no está permitido.");
      return;
    }
    if (stage === "LOST" && !lostReason) {
      setLost({ id, reason: "" });
      return;
    }
    const snapshot = items;
    const position = (byStage.get(stage)?.at(-1)?.position ?? -1) + 1;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage, position, lostReason: lostReason ?? null } : i)));
    start(async () => {
      const r = await moveOpportunityAction({ id, stage, position, lostReason });
      if (!r.ok) {
        setItems(snapshot); // revertir
        toast.error(r.error);
        return;
      }
      toast.success(`Movida a ${OPPORTUNITY_STAGE[stage].label}`);
      router.refresh();
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    move(String(e.active.id), String(e.over.id));
  };

  const active = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: { draggable: "Presiona espacio para tomar la oportunidad, usa las flechas para moverla y espacio de nuevo para soltarla." },
        }}
      >
        <div className={cn("relative flex snap-x gap-3 overflow-x-auto pb-3 scrollbar-thin 2xl:grid 2xl:grid-cols-6 2xl:overflow-visible", pending && "cursor-progress")}>
          {STAGES.map((stage) => (
            <Column key={stage} stage={stage} items={byStage.get(stage) ?? []}>
              {(byStage.get(stage) ?? []).map((item) => (
                <DraggableCard key={item.id} item={item} canManage={canManage} onMove={move} lists={lists} />
              ))}
              {(byStage.get(stage) ?? []).length === 0 ? <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Sin oportunidades</p> : null}
            </Column>
          ))}
        </div>
        <DragOverlay>{active ? <CardBody item={active} canManage={canManage} overlay onMove={move} lists={lists} /> : null}</DragOverlay>
      </DndContext>

      <Dialog open={!!lost} onOpenChange={(o) => !o && setLost(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cerrar como perdida</DialogTitle>
            <DialogDescription>Indica el motivo para dar seguimiento y mejorar la conversión.</DialogDescription>
          </DialogHeader>
          <FormField id="lostReason" label="Motivo" required error={lost?.error}>
            <Textarea
              id="lostReason"
              rows={3}
              maxLength={300}
              value={lost?.reason ?? ""}
              onChange={(e) => setLost((l) => (l ? { ...l, reason: e.target.value, error: undefined } : l))}
              placeholder="Ej. Eligió otro proveedor"
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLost(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!lost) return;
                if (lost.reason.trim().length < 3) {
                  setLost({ ...lost, error: "Escribe el motivo." });
                  return;
                }
                const { id, reason } = lost;
                setLost(null);
                move(id, "LOST", reason.trim());
              }}
            >
              Marcar como perdida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
