"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Confirmación antes de una acción irreversible o sensible. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "default",
  onConfirm,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  onConfirm: () => Promise<boolean | void>;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={variant}
            loading={loading}
            onClick={async () => {
              setLoading(true);
              const result = await onConfirm();
              setLoading(false);
              if (result !== false) setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
