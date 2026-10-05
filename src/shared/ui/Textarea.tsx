"use client";

import * as React from "react";
import { cn } from "@/shared/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Auto-grow up to maxRows (default 8). */
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxRows = 8, rows = 1, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const target = e.target;
      target.style.height = "auto";
      
      const computedStyle = window.getComputedStyle(target);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
      const padding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
      
      const maxHeight = (maxRows * lineHeight) + padding;
      
      target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
      
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        ref={internalRef}
        rows={rows}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        onChange={handleInput}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
