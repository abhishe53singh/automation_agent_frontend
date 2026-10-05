"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { cn } from "@/shared/lib/cn";
import { Button, type ButtonProps } from "./Button";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  text: string;
  label?: string;
}

export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  ({ text, label = "Copy", className, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    }, [text]);

    return (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-8", className)}
        onClick={handleCopy}
        aria-label={label}
        title={label}
        {...props}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    );
  }
);
CopyButton.displayName = "CopyButton";
