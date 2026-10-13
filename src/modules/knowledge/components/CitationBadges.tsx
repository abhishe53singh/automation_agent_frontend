"use client";

import * as React from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { useCitations, type Citation } from "@/modules/knowledge";
import { Badge } from "@/shared/ui";

export function CitationBadges({ responseId }: { responseId: string }) {
  const citations = useCitations({ responseId });
  const [open, setOpen] = React.useState(false);

  const list: Citation[] = citations.data ?? [];
  if (list.length === 0) return null;

  return (
    <div className="mt-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          title="Toggle grounding sources"
        >
          <BookOpen className="h-3 w-3" aria-hidden />
          <span>{list.length} source{list.length === 1 ? "" : "s"}</span>
        </button>
        {list.slice(0, 3).map((cite: Citation, idx: number) => (
          <Badge key={cite.id} variant="neutral" className="text-[10px] px-1.5 py-0">
            [{idx + 1}] {cite.document_title || "Document"}
          </Badge>
        ))}
      </div>

      {open && (
        <div className="mt-2 space-y-1.5 rounded border border-border bg-muted/40 p-2.5">
          {list.map((cite: Citation, idx: number) => (
            <div key={cite.id} className="text-muted-foreground">
              <span className="font-semibold text-foreground">[{idx + 1}] {cite.document_title || "Untitled"}:</span>{" "}
              {cite.quote ? (
                <span className="italic">“{cite.quote}”</span>
              ) : (
                <span>Referenced chunk</span>
              )}
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

