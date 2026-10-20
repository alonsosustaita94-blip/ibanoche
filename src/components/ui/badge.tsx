import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold",
  {
    variants: {
      tone: {
        blue: "bg-brand-ice text-brand-blue",
        turquoise: "bg-brand-mint text-[#1f8f94]",
        coral: "bg-brand-blush text-[#c23444]",
        green: "bg-brand-greenSoft text-brand-green",
        amber: "bg-brand-amberSoft text-brand-amber",
        gray: "bg-muted text-muted-foreground",
        solid: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { tone: "gray" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
