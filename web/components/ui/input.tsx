import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full border border-[var(--color-border-strong)] bg-[var(--color-control)] px-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] transition-colors focus-visible:border-[var(--color-focus)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:bg-[var(--color-control)]",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
