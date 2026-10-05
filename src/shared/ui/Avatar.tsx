"use client";

import * as React from "react";
import { cn } from "@/shared/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
  {
    variants: {
      size: {
        sm: "h-7 w-7 text-xs",
        md: "h-9 w-9 text-sm",
        lg: "h-11 w-11 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof avatarVariants> {
  name: string;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, name, ...props }, ref) => {
    const initials = React.useMemo(() => {
      if (!name) return "";
      const words = name.trim().split(/\s+/);
      if (words.length === 0) return "";
      if (words.length === 1) return words[0].charAt(0).toUpperCase();
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }, [name]);

    return (
      <span
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        {initials}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";
