import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-brand-ink shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-brand-ink shadow-sm placeholder:text-muted-foreground/70 focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60 aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

/** Select nativo con el estilo del sistema (funciona con FormData y en móvil). */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full appearance-none rounded-lg border border-input select-chevron bg-card px-3 pr-9 text-sm text-brand-ink shadow-sm focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60 aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
NativeSelect.displayName = "NativeSelect";
