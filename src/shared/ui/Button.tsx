"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Spinner } from "@/shared/ui/Spinner";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a <button> (e.g. a Link). */
  asChild?: boolean;
  /** Show a spinner, disable the button and mark it busy for assistive tech. */
  loading?: boolean;
}

/** Presentational button. Styling only — no business logic, semantic tokens
 *  only (see .agent/theme_plan.txt). */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    fullWidth,
    asChild = false,
    loading = false,
    disabled,
    type,
    children,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled || loading;

  return (
    <Comp
      ref={ref}
      // `type` is meaningless on the Slot/child branch, hence the conditional.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={asChild ? undefined : isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});
Button.displayName = "Button";

export { buttonVariants };
