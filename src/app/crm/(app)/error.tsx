"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blush text-brand-coral">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h1 className="font-display text-lg font-bold text-brand-ink">No pudimos cargar esta sección</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, avisa al administrador.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
