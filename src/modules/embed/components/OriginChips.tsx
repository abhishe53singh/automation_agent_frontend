"use client";

import { AlertTriangle, Plus, X } from "lucide-react";
import * as React from "react";

import { Button, Input } from "@/shared/ui";

import { normalizeOrigin } from "../snippets";

export interface OriginChipsProps {
  value: string[];
  onChange: (next: string[]) => void;
}

/** Allowed-website editor: `https://host[:port]` chips with add/remove. */
export function OriginChips({ value, onChange }: OriginChipsProps) {
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  const add = () => {
    const check = normalizeOrigin(draft);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    if (value.includes(check.origin)) {
      setError("That website is already in the list.");
      return;
    }
    onChange([...value, check.origin]);
    setDraft("");
    setError(undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Input
          label="Allowed websites"
          placeholder="https://shop.example.com"
          value={draft}
          error={error}
          hint="Only pages on these sites can load the widget. Use https://host or https://host:port."
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" className="mt-6" onClick={add}>
          <Plus aria-hidden />
          Add
        </Button>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Allowed websites">
          {value.map((origin) => (
            <li
              key={origin}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pl-3 pr-1 text-xs text-secondary-foreground"
            >
              <span className="font-mono">{origin}</span>
              <button
                type="button"
                aria-label={`Remove ${origin}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => onChange(value.filter((item) => item !== origin))}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p
          role="note"
          className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-2 text-xs text-foreground"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          No websites listed: any site that copies your snippet can embed this widget and use your
          tokens. Add your own domain to lock it down.
        </p>
      )}
    </div>
  );
}
