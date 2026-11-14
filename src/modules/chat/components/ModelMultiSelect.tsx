"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui";

export interface ModelOption {
  id: string;
  label: string;
  /** Extra text after the name, e.g. "(disabled)". */
  note?: string;
}

/**
 * Pick any number of models for the next message.
 *
 * `value` is `null` for "All" (whatever `allIds` means for the caller, e.g.
 * every active model, or the chat's enabled set) or an explicit list. Ticking
 * every model of `allIds` folds back to `null`, so "All" stays "All". An
 * empty list is a real state ("none picked") the caller must reject on send.
 *
 * The menu stays open while ticking, so several models can be picked at once.
 */
export function ModelMultiSelect({
  options,
  allIds,
  value,
  onChange,
  allLabel,
  disabled,
  className,
}: {
  options: ModelOption[];
  allIds: string[];
  value: string[] | null;
  onChange: (next: string[] | null) => void;
  /** Text for the "All" row and trigger, e.g. "All active models". */
  allLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const selected = React.useMemo(() => new Set(value ?? allIds), [value, allIds]);
  const allSet = React.useMemo(() => new Set(allIds), [allIds]);

  const normalize = (next: Set<string>) => {
    const isAll = next.size === allSet.size && [...allSet].every((id) => next.has(id));
    // Keep the caller's option order for a stable request body.
    onChange(isAll ? null : options.map((o) => o.id).filter((id) => next.has(id)));
  };

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    normalize(next);
  };

  const triggerText =
    value === null
      ? `${allLabel} (${allIds.length})`
      : value.length === 0
        ? "No model selected"
        : value.length === 1
          ? (options.find((o) => o.id === value[0])?.label ?? "1 model")
          : `${value.length} models`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Models for this message: ${triggerText}`}
        className={cn(
          "inline-flex h-8 w-52 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          value !== null && value.length === 0 && "border-destructive",
          className,
        )}
      >
        <span className="truncate">{triggerText}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuCheckboxItem
          checked={value === null}
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(checked) => onChange(checked ? null : [])}
          className="font-medium"
        >
          {allLabel} ({allIds.length})
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={selected.has(option.id)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => toggle(option.id, checked === true)}
          >
            <span className="truncate">{option.label}</span>
            {option.note ? (
              <span className="shrink-0 text-xs text-muted-foreground">{option.note}</span>
            ) : null}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
