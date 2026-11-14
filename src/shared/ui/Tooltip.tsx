"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Tooltip as a speech bubble: filled with the primary colour, rounded, with a
 * real arrow pointing at the trigger (Radix positions and flips it).
 *
 *   <TooltipProvider>                     // once, around a group of tooltips
 *     <Hint label="Dashboard" icon={<LayoutDashboard />}>
 *       <button …/>
 *     </Hint>
 *   </TooltipProvider>
 */

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={8}
      className={cn(
        // No overflow-hidden: it would clip the arrow. pointer-events-none:
        // a label never blocks what is underneath it (e.g. a neighbouring
        // trigger the user is moving to).
        "tooltip-bubble pointer-events-none z-50 flex max-w-xs items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg [&_svg:not(.tooltip-arrow)]:size-4 [&_svg:not(.tooltip-arrow)]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      {/* Small, gentle arrow. `tooltip-arrow` keeps the icon-size rule above
          from stretching it (it is an <svg> too). */}
      <TooltipPrimitive.Arrow width={12} height={6} className="tooltip-arrow fill-primary" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** One-liner tooltip: wraps a single focusable element. `disabled` renders the
 *  child alone (e.g. when the label is already visible). */
export function Hint({
  label,
  icon,
  side = "right",
  disabled = false,
  children,
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
  children: React.ReactElement;
}) {
  if (disabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>
        {icon}
        <span>{label}</span>
      </TooltipContent>
    </Tooltip>
  );
}
