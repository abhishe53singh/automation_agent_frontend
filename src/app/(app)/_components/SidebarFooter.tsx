"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronUp, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { useLogout, useSession } from "@/modules/auth/hooks";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";
import { Hint } from "@/shared/ui/Tooltip";

import { SETTINGS_ITEM } from "../_lib/navigation";

/**
 * Bottom of the sidebar: the profile button, with settings, theme and sign out
 * kept together in a group that opens ABOVE it when the profile is clicked.
 * Shared by the desktop column and the mobile drawer, since both render
 * `Sidebar`. In the collapsed rail everything is an icon with a tooltip.
 *
 * The group closes on a second click, Escape, a click outside the footer, or
 * any navigation.
 */
export function SidebarFooter({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  /** Called after the Settings link is clicked (closes the mobile drawer). */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useSession();
  const logout = useLogout();
  const menuId = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);

  // Close on navigation (derived-state reset, no effect needed).
  const [trackedPath, setTrackedPath] = React.useState(pathname);
  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    setOpen(false);
  }

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      // Tooltips/dropdowns portal outside the footer; only close for clicks
      // that land somewhere else in the page.
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-radix-popper-content-wrapper]")) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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

  const settingsActive =
    pathname === SETTINGS_ITEM.href || pathname.startsWith(`${SETTINGS_ITEM.href}/`);
  const SettingsIcon = SETTINGS_ITEM.icon;
  const toggle = () => setOpen((value) => !value);
  const profileLabel = user ? `Account menu for ${user.username}` : "Account menu";

  if (collapsed) {
    return (
      <div ref={rootRef} className="flex flex-col items-center gap-2 border-t border-border pt-3">
        {open ? (
          <div id={menuId} role="group" aria-label="Account" className="flex flex-col items-center gap-2">
            <Hint label={SETTINGS_ITEM.label} icon={<SettingsIcon />}>
              <Link
                href={SETTINGS_ITEM.href as Route}
                onClick={onNavigate}
                aria-label={SETTINGS_ITEM.label}
                aria-current={settingsActive ? "page" : undefined}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  settingsActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <SettingsIcon className="size-4" />
              </Link>
            </Hint>
            <ThemeCycleButton />
            {user ? (
              <Hint label="Sign out" icon={<LogOut />}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  onClick={signOut}
                  disabled={logout.isPending}
                  className="shrink-0"
                >
                  <LogOut className="size-4" />
                </Button>
              </Hint>
            ) : null}
          </div>
        ) : null}

        <Hint
          label={
            user ? (
              <span className="flex flex-col">
                <span>{user.username}</span>
                {user.email ? (
                  <span className="text-xs font-normal opacity-80">{user.email}</span>
                ) : null}
              </span>
            ) : (
              "Account"
            )
          }
        >
          <button
            type="button"
            onClick={toggle}
            aria-label={profileLabel}
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            className={cn(
              "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              open && "ring-2 ring-primary/60",
            )}
          >
            {user ? (
              <Avatar name={user.username} size="sm" />
            ) : (
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserRound className="size-4" />
              </span>
            )}
          </button>
        </Hint>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-1 border-t border-border pt-3">
      {open ? (
        <div id={menuId} role="group" aria-label="Account" className="space-y-1">
          <Link
            href={SETTINGS_ITEM.href as Route}
            onClick={onNavigate}
            aria-current={settingsActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              settingsActive
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <SettingsIcon className="size-4 shrink-0" />
            <span className="truncate">{SETTINGS_ITEM.label}</span>
          </Link>
          <div className="flex items-center justify-between gap-2 px-3 py-1">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          {user ? (
            <button
              type="button"
              onClick={signOut}
              disabled={logout.isPending}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <LogOut className="size-4 shrink-0" />
              <span>Sign out</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-label={profileLabel}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-accent",
        )}
      >
        {user ? (
          <Avatar name={user.username} size="sm" />
        ) : (
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {user?.username ?? "Account"}
          </span>
          {user?.email ? (
            <span className="block truncate text-xs text-muted-foreground" title={user.email}>
              {user.email}
            </span>
          ) : null}
        </span>
        <ChevronUp
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            !open && "rotate-180",
          )}
        />
      </button>
    </div>
  );
}

const THEMES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/** True only after hydration (theme is unknown on the server). */
const useIsHydrated = () =>
  React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

/** The collapsed rail's theme switch: one button cycling light → dark → system. */
function ThemeCycleButton() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsHydrated();
  const index = Math.max(
    0,
    THEMES.findIndex((option) => option.value === (mounted ? theme : "system")),
  );
  const current = THEMES[index];
  const next = THEMES[(index + 1) % THEMES.length];
  const Icon = current.Icon;

  return (
    <Hint label={`Theme: ${current.label} (click for ${next.label})`} icon={<Icon />}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
        onClick={() => setTheme(next.value)}
        className="shrink-0"
      >
        <Icon className="size-4" />
      </Button>
    </Hint>
  );
}
