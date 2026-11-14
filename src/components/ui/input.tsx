import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-soft/60 focus-visible:outline-none focus-visible:border-brand-400 focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-danger focus-visible:border-danger",
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
        "flex min-h-[72px] w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink-soft/60 focus-visible:outline-none focus-visible:border-brand-400 focus-visible:shadow-ring",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
