"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarPlus, CheckCheck, Clock, FilePlus2, Hand, Link2, RotateCcw, Target, Unlink } from "lucide-react";
import { linkConversationPatientAction, replyConversationAction, setConversationStatusAction } from "@/server/actions/emilia";
import type { PatientOption } from "@/server/actions/lookup";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { notifyResult } from "@/components/shared/action-toast";
import { PatientPicker } from "@/components/shared/pickers";
import { cn } from "@/lib/utils";
import { OpportunityFormDialog, type Option, type OpportunityFormValues } from "../oportunidades/opportunity-form";

export function ConversationActions({
  conversationId,
  status,
  assignedToMe,
  patient,
  perms,
  opportunity,
  lists,
}: {
  conversationId: string;
  status: string;
  assignedToMe: boolean;
  patient: { id: string; name: string } | null;
  perms: { reply: boolean; quotes: boolean; appointments: boolean; opportunities: boolean };
  opportunity: OpportunityFormValues;
  lists: { owners: Option[]; branches: Option[]; partners: Option[] };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: "take" | "pending" | "close" | "reopen") =>
    start(async () => {
      if (notifyResult(await setConversationStatusAction(conversationId, action))) router.refresh();
    });
  const closed = status === "CLOSED";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {perms.reply && !closed ? (
        <>
          {!(assignedToMe && status === "TRANSFERRED") ? (
            <Button size="sm" variant="soft" disabled={pending} onClick={() => run("take")}>
              <Hand /> Tomar conversación
            </Button>
          ) : null}
          {status !== "PENDING" ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run("pending")}>
              <Clock /> Marcar pendiente
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("close")}>
            <CheckCheck /> Cerrar
          </Button>
        </>
      ) : null}
      {perms.reply && closed ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("reopen")}>
          <RotateCcw /> Reabrir
        </Button>
      ) : null}
      {perms.reply ? <LinkPatientDialog conversationId={conversationId} patient={patient} /> : null}
      {perms.quotes ? (
        patient ? (
          <Link href={`/crm/cotizaciones/nueva?patientId=${patient.id}`} className={buttonVariants({ size: "sm", variant: "secondary" })}>
            <FilePlus2 /> Crear cotización
          </Link>
        ) : (
          <Button size="sm" variant="secondary" disabled title="Vincula un paciente para crear una cotización">
            <FilePlus2 /> Crear cotización
          </Button>
        )
      ) : null}
      {perms.appointments ? (
        patient ? (
          <Link href={`/crm/agenda?nueva=1&patientId=${patient.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            <CalendarPlus /> Agendar cita
          </Link>
        ) : (
          <Button size="sm" variant="outline" disabled title="Vincula un paciente para agendar">
            <CalendarPlus /> Agendar cita
          </Button>
        )
      ) : null}
      {perms.opportunities ? (
        <OpportunityFormDialog
          title="Registrar oportunidad"
          trigger={
            <Button size="sm" variant="outline">
              <Target /> Registrar oportunidad
            </Button>
          }
          initial={opportunity}
          patientName={patient?.name}
          {...lists}
        />
      ) : null}
    </div>
  );
}

function LinkPatientDialog({ conversationId, patient }: { conversationId: string; patient: { id: string; name: string } | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<PatientOption | null>(null);
  const [pending, start] = useTransition();
  const save = (patientId: string | null) =>
    start(async () => {
      if (notifyResult(await linkConversationPatientAction(conversationId, patientId))) {
        setOpen(false);
        setValue(null);
        router.refresh();
      }
    });
  if (patient) {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => save(null)} title={`Desvincular a ${patient.name}`}>
        <Unlink /> Desvincular paciente
      </Button>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Link2 /> Vincular paciente
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Vincular paciente</DialogTitle>
          <DialogDescription>Asocia la conversación con la ficha administrativa del paciente.</DialogDescription>
        </DialogHeader>
        <PatientPicker value={value} onChange={setValue} id="link-patient" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!value} loading={pending} onClick={() => value && save(value.id)}>
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReplyForm({ conversationId, closed }: { conversationId: string; closed: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const submit = () => {
    if (!body.trim()) return;
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    fd.set("body", body);
    start(async () => {
      if (notifyResult(await replyConversationAction(fd))) {
        setBody("");
        router.refresh();
      }
    });
  };
  return (
    <form
      className="grid gap-2 border-t bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="reply" className="font-display text-xs font-bold text-brand-ink">
        Responder como personal
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          id="reply"
          rows={2}
          maxLength={2000}
          value={body}
          disabled={closed || pending}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder={closed ? "Reabre la conversación para responder" : "Escribe una respuesta administrativa (sin interpretación clínica)"}
          className="min-h-[60px] resize-none"
        />
        <Button type="submit" loading={pending} disabled={closed || !body.trim()} className="shrink-0">
          Guardar respuesta
        </Button>
      </div>
      <p className={cn("text-[0.7rem] text-muted-foreground")}>
        La respuesta se guarda en el historial del CRM. No se envía a WhatsApp ni al sitio web hasta configurar la integración del canal.
      </p>
    </form>
  );
}
