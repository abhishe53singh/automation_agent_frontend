"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLogout, useSession } from "@/modules/auth/hooks";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";

/**
 * Bottom of the sidebar: theme switch, signed-in identity and sign out
 * (moved here from the top bar). Shared by the desktop column and the mobile
 * drawer, since both render `Sidebar`.
 */
export function SidebarFooter() {
  const router = useRouter();
  const { data: user } = useSession();
  const logout = useLogout();

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
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2 px-2">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>

      {user ? (
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <Avatar name={user.username} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.username}</p>
            {user.email ? (
              <p className="truncate text-xs text-muted-foreground" title={user.email}>
                {user.email}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            title="Sign out"
            onClick={signOut}
            disabled={logout.isPending}
            className="shrink-0"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
