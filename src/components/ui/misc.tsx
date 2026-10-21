import * as React from "react";
import { cn, initials } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-border", className)} />;
}

const avatarTones = ["bg-brand-ice text-brand-blue", "bg-brand-mint text-[#1f8f94]", "bg-brand-blush text-[#c23444]"];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const tone = avatarTones[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarTones.length];
  return (
    <span
      className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[0.7rem] font-bold", tone, className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
