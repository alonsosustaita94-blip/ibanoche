"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Búsqueda sincronizada con la URL (?q=) con espera breve al escribir. */
export function SearchInput({ placeholder, param = "q", className }: { placeholder: string; param?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(param) ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setValue(params.get(param) ?? ""), [params, param]);

  const update = (v: string) => {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (v.trim()) next.set(param, v.trim());
      else next.delete(param);
      next.delete("page");
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    }, 300);
  };

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
        aria-label={placeholder}
      />
      {pending ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-secondary" aria-hidden /> : null}
    </div>
  );
}
