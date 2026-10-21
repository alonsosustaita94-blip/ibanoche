"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { NativeSelect } from "@/components/ui/input";
import { PERIOD_LABELS, type Period } from "@/lib/dates";

export function PeriodFilter({ value }: { value: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Periodo</span>
      <CalendarRange className="pointer-events-none absolute left-3 h-4 w-4 text-brand-turquoise" aria-hidden />
      <NativeSelect
        className="h-9 w-48 pl-9 text-xs font-semibold"
        value={value}
        aria-busy={pending}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("period", e.target.value);
          start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
        }}
      >
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABELS[p]}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

