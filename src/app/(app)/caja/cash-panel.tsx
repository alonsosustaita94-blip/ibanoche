"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { toast } from "sonner";
import { closeCashAction, openCashAction } from "@/server/actions/pos";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

export function OpenCashDialog({ branchId, branchName }: { branchId: string; branchName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();
  const cents = parseMoneyToCents(amount || "0");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <LockKeyholeOpen /> Abrir caja
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
          <DialogDescription>{branchName}</DialogDescription>
        </DialogHeader>
        <FormField id="opening" label="Fondo inicial en efectivo" error={cents === null ? "Escribe un importe válido." : undefined}>
          <Input id="opening" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            disabled={cents === null}
            onClick={() =>
              start(async () => {
                const r = await openCashAction(branchId, cents ?? 0);
                if (!r.ok) return void toast.error(r.error);
                toast.success("Caja abierta");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Abrir caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CloseCashDialog({ sessionId, expectedCashCents }: { sessionId: string; expectedCashCents: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const cents = counted.trim() ? parseMoneyToCents(counted) : null;
  const diff = cents === null ? null : cents - expectedCashCents;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LockKeyhole /> Corte de caja
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Corte de caja</DialogTitle>
          <DialogDescription>Cuenta el efectivo en caja. Al cerrar ya no se podrán registrar ni anular cobros en esta sesión.</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-1.5 rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Efectivo esperado</dt>
            <dd className="font-semibold tabular">{formatMoney(expectedCashCents)}</dd>
          </div>
          {diff !== null ? (
            <div className={`flex justify-between font-semibold ${diff === 0 ? "text-brand-green" : "text-brand-coral"}`}>
              <dt>Diferencia</dt>
              <dd className="tabular">{diff > 0 ? "+" : ""}{formatMoney(diff)}</dd>
            </div>
          ) : null}
        </dl>
        <FormField id="counted" label="Efectivo contado" required>
          <Input id="counted" inputMode="decimal" placeholder="0.00" value={counted} onChange={(e) => setCounted(e.target.value)} />
        </FormField>
        <FormField id="close-notes" label="Observaciones" hint={diff ? "Explica la diferencia." : undefined}>
          <Textarea id="close-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            disabled={cents === null}
            onClick={() =>
              start(async () => {
                const r = await closeCashAction(sessionId, cents ?? 0, notes || undefined);
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.data.differenceCents === 0 ? "Corte registrado sin diferencias" : `Corte registrado con diferencia de ${formatMoney(r.data.differenceCents)}`);
                setOpen(false);
                router.refresh();
              })
            }
          >
            Cerrar caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
