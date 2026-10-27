"use client";

import { useRef, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { deleteResultAction, uploadResultAction } from "@/server/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyResult } from "@/components/shared/action-toast";

type Result = { id: string; fileName: string; sizeBytes: number; note: string | null; createdAt: string; sentAt: string | null; uploadedBy: string | null };

const fmt = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" });

export function ResultsPanel({ patientId, results, canManage }: { patientId: string; results: Result[]; canManage: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      {canManage ? (
        <form
          ref={ref}
          className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              if (notifyResult(await uploadResultAction(fd))) ref.current?.reset();
            });
          }}
        >
          <input type="hidden" name="patientId" value={patientId} />
          <Input type="file" name="file" accept="application/pdf" required aria-label="PDF de resultados" className="sm:w-72" />
          <Input name="note" placeholder="Nota (opcional), p. ej. estudios incluidos" aria-label="Nota" maxLength={200} />
          <Button type="submit" loading={pending} className="shrink-0">
            Subir PDF
          </Button>
        </form>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Emilia envía estos PDF por WhatsApp solo al número registrado del paciente, cuando él los pide y confirma su nombre. Máximo 4 MB por archivo.
      </p>
      {results.length ? (
        <ul className="divide-y rounded-lg border">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
              <FileText className="h-5 w-5 shrink-0 text-brand-blue" />
              <div className="min-w-0 flex-1">
                <a href={`/crm/resultados/${r.id}`} target="_blank" rel="noopener" className="font-semibold text-brand-ink hover:text-brand-blue">
                  {r.fileName}
                </a>
                <p className="text-xs text-muted-foreground">
                  {fmt(r.createdAt)} · {(r.sizeBytes / 1024).toFixed(0)} KB{r.uploadedBy ? ` · ${r.uploadedBy}` : ""}
                  {r.note ? ` · ${r.note}` : ""}
                  {r.sentAt ? ` · Enviado por WhatsApp ${fmt(r.sentAt)}` : ""}
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`¿Eliminar ${r.fileName}?`)) start(async () => void notifyResult(await deleteResultAction(r.id)));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Sin resultados cargados</p>
      )}
    </div>
  );
}
