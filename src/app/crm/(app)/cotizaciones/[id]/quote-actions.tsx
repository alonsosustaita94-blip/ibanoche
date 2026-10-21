"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, Copy, Download, ExternalLink, MessageCircle, Pencil, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { convertQuoteAction, logQuoteWhatsAppAction, setQuoteStatusAction } from "@/server/actions/quotes";
import { QUOTE_STATUS } from "@/lib/labels";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { notifyResult } from "@/components/shared/action-toast";

type Props = {
  quoteId: string;
  status: string;
  transitions: string[];
  canManage: boolean;
  canConvert: boolean;
  hasOrder: { id: string; folio: string } | null;
  convertBlocker: string | null;
  whatsapp: { phone: string | null; consent: boolean | null; message: string };
};

export function QuoteActions(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/api/cotizaciones/${p.quoteId}/pdf`} className={buttonVariants({ variant: "outline" })} download>
        <Download /> Descargar PDF
      </a>
      {p.canManage ? <WhatsAppDialog quoteId={p.quoteId} {...p.whatsapp} isDraft={p.status === "DRAFT"} /> : null}
      {p.canManage && p.status === "DRAFT" ? (
        <Link href={`/crm/cotizaciones/${p.quoteId}/editar`} className={buttonVariants({ variant: "outline" })}>
          <Pencil /> Editar
        </Link>
      ) : null}
      {p.canManage
        ? p.transitions.map((to) => (
            <ConfirmDialog
              key={to}
              trigger={
                <Button variant={to === "REJECTED" ? "outline" : "soft"} disabled={pending}>
                  Marcar {QUOTE_STATUS[to].label.toLowerCase()}
                </Button>
              }
              title={`¿Marcar como “${QUOTE_STATUS[to].label}”?`}
              description={to === "REJECTED" ? "La cotización dejará de contarse como pendiente." : undefined}
              variant={to === "REJECTED" ? "destructive" : "default"}
              onConfirm={async () => {
                const r = await setQuoteStatusAction(p.quoteId, to);
                if (notifyResult(r)) router.refresh();
                return r.ok;
              }}
            />
          ))
        : null}
      {p.hasOrder ? (
        <Link href={`/crm/ordenes/${p.hasOrder.id}`} className={buttonVariants({ variant: "secondary" })}>
          <ExternalLink /> Ver orden {p.hasOrder.folio}
        </Link>
      ) : p.canConvert ? (
        <ConfirmDialog
          trigger={
            <Button variant="secondary" disabled={!!p.convertBlocker} title={p.convertBlocker ?? undefined}>
              <ArrowRightLeft /> Convertir en orden
            </Button>
          }
          title="¿Convertir en orden?"
          description="Se creará una orden confirmada con los mismos precios de esta cotización y la cotización quedará como aceptada."
          confirmLabel="Crear orden"
          onConfirm={async () => {
            const r = await convertQuoteAction(p.quoteId);
            if (!r.ok) {
              toast.error(r.error);
              return false;
            }
            toast.success(r.data.created ? `Orden ${r.data.folio} creada` : `Ya existía la orden ${r.data.folio}`);
            start(() => router.push(`/crm/ordenes/${r.data.orderId}`));
          }}
        />
      ) : null}
      {p.convertBlocker && !p.hasOrder && p.canConvert ? <p className="basis-full text-xs text-muted-foreground">{p.convertBlocker}</p> : null}
    </div>
  );
}

function WhatsAppDialog({ quoteId, phone, consent, message, isDraft }: { quoteId: string; phone: string | null; consent: boolean | null; message: string; isDraft: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(message);
  const digits = phone?.replace(/\D/g, "").slice(-10) ?? "";
  const url = useMemo(() => (digits.length === 10 ? `https://wa.me/52${digits}?text=${encodeURIComponent(text)}` : null), [digits, text]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensaje copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageCircle /> Preparar mensaje de WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Mensaje de WhatsApp</DialogTitle>
          <DialogDescription>Revisa y ajusta el texto. Se abrirá WhatsApp con el mensaje listo; el envío lo haces tú.</DialogDescription>
        </DialogHeader>
        {consent === false ? (
          <p className="flex items-start gap-2 rounded-lg bg-brand-amberSoft p-3 text-sm text-brand-ink">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber" />
            El paciente no ha autorizado contacto promocional. Envía la cotización solo si él la solicitó.
          </p>
        ) : null}
        {!url ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No hay un teléfono de 10 dígitos registrado. Copia el mensaje y envíalo por otro medio.</p> : null}
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} aria-label="Texto del mensaje" className="font-mono text-xs" />
        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            <Copy /> Copiar
          </Button>
          {url ? (
            <Button
              variant="secondary"
              onClick={async () => {
                window.open(url, "_blank", "noopener,noreferrer");
                const r = await logQuoteWhatsAppAction(quoteId, isDraft);
                if (r.ok) {
                  toast.success(isDraft ? "Cotización marcada como enviada" : "Envío registrado");
                  router.refresh();
                }
                setOpen(false);
              }}
            >
              <ExternalLink /> Abrir WhatsApp
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
