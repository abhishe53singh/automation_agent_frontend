"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isMockMode } from "@/config/env";

import { chatKeys, getTurnStatuses, type TurnStatus } from "../api";
import {
  listTrackedTurns,
  onTrackedTurnsChange,
  untrackTurn,
  type TrackedTurn,
} from "../background-turns";

/**
 * App-wide watcher for prompts that are still being answered.
 *
 * Mounted once in the app shell, so it keeps running when the user leaves the
 * chat, opens another page or starts a new chat. Generation itself never
 * depended on the page (it runs on the server); this only checks on the
 * tracked prompts and, when one finishes, shows a popup with a link back to
 * the chat (plus a system notification if the tab is in the background and
 * the user allowed notifications).
 *
 * No popup when the user is already looking at that chat: they can see the
 * answer arrive there.
 */

const POLL_MS = 3_000;

function chatPath(sessionId: string): Route {
  return `/chat/${sessionId}` as Route;
}

function describe(status: TurnStatus, tracked: TrackedTurn | undefined) {
  const where = status.session_title?.trim() || "your chat";
  const asked = tracked?.prompt ? `“${tracked.prompt}”` : "Your prompt";
  switch (status.state) {
    case "completed":
      return {
        kind: "success" as const,
        title: "Prompt completed",
        body: `${asked} in ${where} has been answered.`,
      };
    case "partial":
      return {
        kind: "warning" as const,
        title: "Prompt completed with errors",
        body: `${asked} in ${where}: ${status.completed} of ${status.total} answers finished, ${status.failed} failed.`,
      };
    case "failed":
      return {
        kind: "error" as const,
        title: "Prompt failed",
        body: `${asked} in ${where} could not be answered. Open the chat to retry.`,
      };
    default: // stalled
      return {
        kind: "error" as const,
        title: "Prompt not answered",
        body: `${asked} in ${where} is not being generated (check the model's API key).`,
      };
  }
}

function systemNotify(title: string, body: string, onClick: () => void): void {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const note = new Notification(title, { body, tag: `aa-turn-${title}-${body}` });
    note.onclick = () => {
      window.focus();
      onClick();
      note.close();
    };
  } catch {
    // Some browsers throw for page-created notifications; the in-app popup
    // is still shown.
  }
}

export function BackgroundTurnWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [tracked, setTracked] = React.useState<TrackedTurn[]>([]);

  // Current page for the polling loop without restarting it on navigation.
  const pathRef = React.useRef(pathname);
  React.useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  React.useEffect(() => {
    if (isMockMode()) return;
    const sync = () => setTracked(listTrackedTurns());
    sync();
    return onTrackedTurnsChange(sync);
  }, []);

  // Ask once for system-notification permission when there is something to
  // notify about (in-app popups work without it).
  const hasTracked = tracked.length > 0;
  React.useEffect(() => {
    if (!hasTracked) return;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission().catch(() => undefined);
      }
    } catch {
      // Not supported: in-app popups only.
    }
  }, [hasTracked]);

  const announce = React.useCallback(
    (status: TurnStatus, item: TrackedTurn | undefined) => {
      const href = chatPath(status.session_id);
      const open = () => router.push(href);
      const viewingIt = pathRef.current === href && document.visibilityState === "visible";
      if (viewingIt) return;

      const { kind, title, body } = describe(status, item);
      const options = {
        description: body,
        duration: 12_000,
        action: { label: "Open chat", onClick: open },
      };
      if (kind === "success") toast.success(title, options);
      else if (kind === "warning") toast.warning(title, options);
      else toast.error(title, options);

      if (document.visibilityState === "hidden") systemNotify(title, body, open);
    },
    [router],
  );

  React.useEffect(() => {
    if (!hasTracked || isMockMode()) return;
    let cancelled = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const check = async () => {
      // Read storage directly: the ref may lag one render behind.
      const items = listTrackedTurns();
      if (cancelled || inFlight || items.length === 0) return;
      inFlight = true;
      if (timer) clearTimeout(timer);
      controller = new AbortController();
      try {
        const statuses = await getTurnStatuses(
          items.map((item) => item.turnId),
          controller.signal,
        );
        if (cancelled) return;
        const byId = new Map(statuses.map((status) => [status.turn_id, status]));
        for (const item of items) {
          const status = byId.get(item.turnId);
          if (!status) {
            // Chat deleted (or not ours any more): nothing to announce.
            untrackTurn(item.turnId);
            continue;
          }
          if (status.state === "running") continue;
          // Only the tab that removes it announces it.
          if (!untrackTurn(item.turnId)) continue;
          void queryClient.invalidateQueries({ queryKey: chatKeys.session(status.session_id) });
          void queryClient.invalidateQueries({ queryKey: ["chat", "list"] });
          announce(status, item);
        }
      } catch {
        // Offline / signed out / server restarting: try again next tick.
      } finally {
        inFlight = false;
        if (!cancelled) timer = setTimeout(() => void check(), POLL_MS);
      }
    };

    // Check right away when the user comes back to the tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasTracked, announce, queryClient]);

  return null;
}
