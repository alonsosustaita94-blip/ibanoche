"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Filtro de lista sincronizado con un parámetro de la URL. */
export function FilterSelect({
  param,
  options,
  allLabel = "Todos",
  label,
  className,
}: {
  param: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <NativeSelect
      aria-label={label}
      className={cn("w-full sm:w-44", className)}
      value={params.get(param) ?? ""}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        next.delete("page");
        startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
      }}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
