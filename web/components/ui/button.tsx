import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-start text-left border border-transparent gap-2 whitespace-nowrap px-3 text-[13px] font-bold transition-colors duration-[var(--motion-fast)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)] disabled:pointer-events-none disabled:border-dashed disabled:border-[var(--color-border)] disabled:bg-[var(--color-page)] disabled:text-[var(--color-text)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
        secondary:
          "border border-[var(--color-border-strong)] bg-[var(--color-control)] text-[var(--color-text)] hover:bg-[var(--color-control-hover)] hover:text-[var(--color-primary-foreground)] active:bg-[var(--color-control-active)] active:text-[var(--color-primary-foreground)]",
        ghost:
          "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover)] hover:text-[var(--color-primary-foreground)]",
        destructive:
          "bg-[var(--color-error)] text-[var(--color-error-foreground)] hover:bg-[var(--color-error-hover)]",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3",
        lg: "h-10 px-4 text-sm",
        icon: "h-9 w-9 justify-center px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      data-variant={variant ?? "primary"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
