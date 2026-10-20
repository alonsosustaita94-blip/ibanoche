"use client";

import { useRef, useTransition } from "react";
import { addInteractionAction } from "@/server/actions/patients";
import { INTERACTION_TYPE } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { notifyResult } from "@/components/shared/action-toast";

export function InteractionForm({ patientId }: { patientId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          if (notifyResult(await addInteractionAction(fd))) ref.current?.reset();
        });
      }}
    >
      <input type="hidden" name="patientId" value={patientId} />
      <NativeSelect name="type" aria-label="Tipo de interacción" className="sm:w-36" defaultValue="CALL">
        {Object.entries(INTERACTION_TYPE).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </NativeSelect>
      <Input name="summary" placeholder="Resumen administrativo (sin datos clínicos)" aria-label="Resumen" required minLength={3} maxLength={500} />
      <Button type="submit" loading={pending} className="shrink-0">
        Registrar
      </Button>
    </form>
  );
}
