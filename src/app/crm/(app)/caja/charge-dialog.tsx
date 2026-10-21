"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { chargeOrderAction } from "@/server/actions/pos";
import { newIdempotencyKey } from "@/lib/idempotency";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePaymentForm } from "./payment-form";

/** Cobro del saldo de una orden existente. */
export function ChargeDialog({ order, defaultOpen = false, disabled }: { order: { id: string; folio: string; patient: string; dueCents: number }; defaultOpen?: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [key, setKey] = useState(newIdempotencyKey);
  const [pending, start] = useTransition();
  const pay = usePaymentForm(order.dueCents);

  const submit = () =>
    start(async () => {
      // La misma llave se reutiliza si se reintenta: el servidor no duplica el cobro.
      const r = await chargeOrderAction({ orderId: order.id, parts: pay.parts, idempotencyKey: key });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.data.duplicate ? "Este cobro ya estaba registrado" : "Cobro registrado");
      setKey(newIdempotencyKey());
      pay.reset();
      setOpen(false);
      router.push(`/crm/caja/recibo/${r.data.groupId}`);
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled}>
          <Wallet /> Cobrar
        </Button>
      </DialogTrigger>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Cobrar {order.folio}</DialogTitle>
          <DialogDescription>
            {order.patient} · saldo {formatMoney(order.dueCents)}
          </DialogDescription>
        </DialogHeader>
        {pay.fields}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pending} disabled={!!pay.error}>
            Cobrar {formatMoney(Math.max(0, pay.charge))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
