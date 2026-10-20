"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeDollarSign, MoreHorizontal, Pencil, Power } from "lucide-react";
import { toggleStudyActiveAction } from "@/server/actions/catalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notifyResult } from "@/components/shared/action-toast";
import { PriceDialog } from "./price-dialog";
import { StudyFormDialog } from "./study-form";
import type { CategoryOption, StudyRow } from "./types";

export function StudyRowActions({
  study,
  categories,
  canManage,
  canPrices,
  canViewCost,
}: {
  study: StudyRow;
  categories: CategoryOption[];
  canManage: boolean;
  canPrices: boolean;
  canViewCost: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "prices" | "toggle" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Acciones para ${study.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canManage ? (
            <DropdownMenuItem onSelect={() => setDialog("edit")}>
              <Pencil /> Editar estudio
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setDialog("prices")}>
            <BadgeDollarSign /> {canPrices ? "Administrar tarifas" : "Ver tarifas"}
          </DropdownMenuItem>
          {canManage ? (
            <DropdownMenuItem destructive={study.active} onSelect={() => setDialog("toggle")}>
              <Power /> {study.active ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage ? (
        <StudyFormDialog categories={categories} canViewCost={canViewCost} initial={study} open={dialog === "edit"} onOpenChange={(o) => setDialog(o ? "edit" : null)} />
      ) : null}
      <PriceDialog study={study} canViewCost={canViewCost} canEdit={canPrices} open={dialog === "prices"} onOpenChange={(o) => setDialog(o ? "prices" : null)} />

      <Dialog open={dialog === "toggle"} onOpenChange={(o) => setDialog(o ? "toggle" : null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{study.active ? "¿Desactivar estudio?" : "¿Activar estudio?"}</DialogTitle>
            <DialogDescription>
              {study.active
                ? `${study.name} dejará de aparecer para cotizar, vender o agendar. Su historial y tarifas se conservan.`
                : `${study.name} volverá a estar disponible para cotizar y vender.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant={study.active ? "destructive" : "default"}
              loading={pending}
              onClick={() =>
                start(async () => {
                  if (notifyResult(await toggleStudyActiveAction(study.id))) {
                    setDialog(null);
                    router.refresh();
                  }
                })
              }
            >
              {study.active ? "Desactivar" : "Activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
