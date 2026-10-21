import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto scrollbar-thin">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
export const TableHeader = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("[&_tr]:border-b", className)} {...p} />
);
export const TableBody = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />
);
export const TableRow = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-border/70 transition-colors hover:bg-muted/60 data-[state=selected]:bg-accent", className)} {...p} />
);
export const TableHead = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "h-10 whitespace-nowrap px-3 text-left align-middle text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground",
      className,
    )}
    {...p}
  />
);
export const TableCell = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-3 py-3 align-middle text-brand-ink", className)} {...p} />
);
