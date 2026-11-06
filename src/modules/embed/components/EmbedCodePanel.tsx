"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import * as React from "react";

import {
  Button,
  ConfirmDialog,
  CopyButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";

import { useRotateEmbedWidgetKey } from "../hooks";
import type { EmbedWidget } from "../schemas";
import { buildEmbedSnippets } from "../snippets";

const subscribeNoop = () => () => undefined;

/** `window.location.origin` on the client, "" during SSR (no hydration mismatch). */
function useAppOrigin(): string {
  return React.useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => "",
  );
}

function SnippetBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative rounded-md border border-border bg-muted">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 pr-12 font-mono text-xs text-foreground">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} label={label} className="absolute right-1 top-1" />
    </div>
  );
}

export function EmbedCodePanel({ widget }: { widget: EmbedWidget }) {
  const appOrigin = useAppOrigin();
  const rotate = useRotateEmbedWidgetKey();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const snippets = buildEmbedSnippets({
    appOrigin,
    publicKey: widget.public_key,
    title: widget.title || widget.name,
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="script">
        <TabsList>
          <TabsTrigger value="script">Script (recommended)</TabsTrigger>
          <TabsTrigger value="iframe">Iframe</TabsTrigger>
        </TabsList>
        <TabsContent value="script" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Paste this just before <code className="font-mono">&lt;/body&gt;</code> on every page
            where the chat bubble should appear.
          </p>
          <SnippetBlock code={snippets.script} label="Copy script snippet" />
        </TabsContent>
        <TabsContent value="iframe" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use this to place the chat inline inside a page instead of as a floating bubble.
          </p>
          <SnippetBlock code={snippets.iframe} label="Copy iframe snippet" />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={snippets.previewUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden />
            Preview
          </a>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
          <RefreshCw aria-hidden />
          Rotate key
        </Button>
        <span className="font-mono text-xs text-muted-foreground">Key: {widget.public_key}</span>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Rotate the widget key?"
        description="A new public key is issued immediately. Snippets already pasted on your websites stop working until you replace them with the new code."
        confirmLabel="Rotate key"
        loading={rotate.isPending}
        onConfirm={() => rotate.mutate(widget.id, { onSettled: () => setConfirmOpen(false) })}
      />
    </div>
  );
}
