"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { useKnowledgeBases, useSearchKnowledgeBase } from "../hooks";
import type { SearchResponse } from "../schemas";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  result,
}: {
  result: SearchResponse["results"][number];
}) {
  return (
    <div className="rounded border border-border p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">
            {result.document_title ?? "Untitled"}{" "}
            {result.heading && (
              <span className="font-normal text-muted-foreground">— {result.heading}</span>
            )}
          </p>
          {result.page_number != null && (
            <p className="text-xs text-muted-foreground">Page {result.page_number}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">#{result.rank}</span>
          <span>{(result.score * 100).toFixed(1)}%</span>
        </div>
      </div>
      <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{result.content}</p>
    </div>
  );
}

// ─── Search panel ─────────────────────────────────────────────────────────────

export function SearchPanel({ projectId: _projectId }: { projectId?: string }) {
  const [selectedKbId, setSelectedKbId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResponse | null>(null);

  const kbs = useKnowledgeBases();
  const search = useSearchKnowledgeBase(selectedKbId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKbId || !query.trim()) return;
    search.mutate({ query: query.trim() }, { onSuccess: setResults });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search</CardTitle>
        <CardDescription>
          Run a semantic search against a knowledge base. Results are ranked by relevance score.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          {/* KB picker */}
          <select
            className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm"
            value={selectedKbId}
            onChange={(e) => {
              setSelectedKbId(e.target.value);
              setResults(null);
            }}
          >
            <option value="">Choose a knowledge base…</option>
            {(kbs.data ?? []).map((kb) => (
              <option key={kb.id} value={kb.id}>
                {kb.name}
              </option>
            ))}
          </select>

          {/* Query input */}
          <input
            type="text"
            className="min-w-0 flex-[3] rounded border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            placeholder="Type a query…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <Button
            type="submit"
            disabled={!selectedKbId || !query.trim()}
            loading={search.isPending}
          >
            <Search className="h-4 w-4" aria-hidden />
            Search
          </Button>
        </form>

        {results && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.results.length} result{results.results.length === 1 ? "" : "s"} · retrieval{" "}
              <code className="text-xs">{results.retrieval_id.slice(0, 8)}…</code>
            </p>
            {results.results.length === 0 ? (
              <p className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                No results matched. Try a different query or lower the min score.
              </p>
            ) : (
              <div className="space-y-2">
                {results.results.map((r) => (
                  <ResultCard key={r.id} result={r} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

