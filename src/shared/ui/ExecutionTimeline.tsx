"use client";

import * as React from "react";
import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import { Badge } from "@/shared/ui";

export interface TimelineEvent {
  id: string;
  step_name: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  output?: string | null;
}

const STATUS_ICONS = {
  pending: Clock,
  running: CircleDashed,
  succeeded: CheckCircle2,
  failed: XCircle,
  skipped: Clock,
};

const STATUS_VARIANTS = {
  pending: "neutral",
  running: "neutral",
  succeeded: "success",
  failed: "destructive",
  skipped: "neutral",
} as const;

export function ExecutionTimeline({
  events,
  title = "Execution Timeline",
}: {
  events: TimelineEvent[];
  title?: string;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
        No execution steps yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <ol className="relative border-l border-border pl-4 space-y-4">
        {events.map((event) => {
          const Icon = STATUS_ICONS[event.status] ?? Clock;
          const variant = STATUS_VARIANTS[event.status] ?? "neutral";
          return (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background ring-4 ring-background">
                <Icon
                  className={`h-3 w-3 ${
                    event.status === "running" ? "animate-spin text-primary" : "text-muted-foreground"
                  }`}
                />
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{event.step_name}</span>
                <Badge variant={variant} className="text-[10px] capitalize">
                  {event.status}
                </Badge>
              </div>
              {event.error && (
                <p className="mt-1 text-xs text-destructive">{event.error}</p>
              )}
              {event.output && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground font-mono">
                  {event.output}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

