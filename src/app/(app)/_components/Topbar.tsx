"use client";

import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useLogout, useSession } from "@/modules/auth/hooks";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export interface TopbarProps {
  /** Opens the mobile navigation drawer (hidden on desktop). */
  onOpenMenu?: () => void;
  className?: string;
}

/** Sticky page header: menu trigger (mobile), page context, theme switch. */
export function Topbar({ onOpenMenu, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Open navigation"
        onClick={onOpenMenu}
        className="lg:hidden"
      >
        <Menu className="size-4" />
      </Button>

      <div className="flex-1" />

      <ThemeToggle />
      <UserMenu />
    </header>
  );
}

/** Signed-in identity plus sign out (phase 2 item 17). */
function UserMenu() {
  const router = useRouter();
  const { data: user } = useSession();
  const logout = useLogout();

  if (!user) return null;

  const signOut = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      // Navigate even if the upstream call failed: the cookies are cleared
      // server-side regardless, so the user must end up on /login.
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted-foreground sm:inline" title={user.email}>
        {user.username}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Sign out"
        title="Sign out"
        onClick={signOut}
        disabled={logout.isPending}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
