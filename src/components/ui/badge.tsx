import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap [&_svg]:size-3", {
  variants: {
    variant: {
      default: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
      solid: "bg-brand-600 text-white",
      outline: "text-ink-soft ring-1 ring-inset ring-border",
      success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
      warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
      danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100",
      muted: "bg-slate-100 text-slate-600",
      info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
