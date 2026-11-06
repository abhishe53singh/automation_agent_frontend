"use client";

import { Globe, MessageCircle, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  ErrorNotice,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";

import { useDeleteEmbedWidget, useEmbedWidgets, useUpdateEmbedWidget } from "../hooks";
import type { EmbedWidget } from "../schemas";
import { EmbedCodePanel } from "./EmbedCodePanel";
import { EmbedConversations } from "./EmbedConversations";
import { EmbedWidgetFormDialog } from "./EmbedWidgetFormDialog";

export const WIDGET_EXPLAINER =
  "Every visit starts a new conversation. Visitors never see other chats. Answers use this project's knowledge bases. Tools (Gmail, Drive, web search, agents) are never available to visitors. Token usage is billed to your account.";

function OriginsSummary({ origins }: { origins: string[] }) {
  if (origins.length === 0) {
    return <Badge variant="warning">Any website</Badge>;
  }
  const shown = origins.slice(0, 2);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((origin) => (
        <Badge key={origin} variant="neutral" className="font-mono">
          {origin.replace(/^https:\/\//, "")}
        </Badge>
      ))}
      {origins.length > shown.length ? (
        <span className="text-xs text-muted-foreground">+{origins.length - shown.length} more</span>
      ) : null}
    </span>
  );
}

function WidgetRow({
  widget,
  selected,
  onSelect,
}: {
  widget: EmbedWidget;
  selected: boolean;
  onSelect: () => void;
}) {
  const update = useUpdateEmbedWidget();
  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3",
        selected ? "border-primary bg-accent/40" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full border border-border"
            // User-chosen brand colour: data, not a design token.
            style={{ backgroundColor: widget.accent_color }}
            aria-hidden
          />
          <span className="truncate text-sm font-medium text-foreground">{widget.name}</span>
          {!widget.is_active ? <Badge variant="neutral">Paused</Badge> : null}
        </span>
        <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" aria-hidden />
            {widget.conversation_count}{" "}
            {widget.conversation_count === 1 ? "conversation" : "conversations"}
          </span>
          <OriginsSummary origins={widget.allowed_origins} />
        </span>
      </button>
      <Switch
        aria-label={`${widget.is_active ? "Pause" : "Activate"} ${widget.name}`}
        checked={widget.is_active}
        disabled={update.isPending}
        onCheckedChange={(checked) =>
          update.mutate({ id: widget.id, patch: { is_active: checked } })
        }
      />
    </li>
  );
}

function WidgetDetail({
  widget,
  projectId,
  onEdit,
  onDeleted,
}: {
  widget: EmbedWidget;
  projectId: string;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const remove = useDeleteEmbedWidget(projectId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{widget.name}</CardTitle>
            <CardDescription>
              {widget.title ? `Header: "${widget.title}". ` : ""}
              {widget.is_active
                ? "Live: visitors can chat with it."
                : "Paused: the widget shows as unavailable on your site."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil aria-hidden />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="code">
          <TabsList>
            <TabsTrigger value="code">Embed code</TabsTrigger>
            <TabsTrigger value="conversations">
              Conversations ({widget.conversation_count})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="code">
            <EmbedCodePanel widget={widget} />
          </TabsContent>
          <TabsContent value="conversations">
            <EmbedConversations widgetId={widget.id} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${widget.name}"?`}
        description="The widget stops working on every website immediately and its visitor conversations are deleted. This cannot be undone."
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(widget.id, {
            onSuccess: () => {
              setConfirmOpen(false);
              onDeleted();
            },
          })
        }
      />
    </Card>
  );
}

export function EmbedWidgetsPanel({ projectId }: { projectId: string }) {
  const widgets = useEmbedWidgets(projectId);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EmbedWidget | null>(null);

  const list = widgets.data ?? [];
  // Fall back to the first widget so the detail pane is never empty.
  const selected = list.find((w) => w.id === selectedId) ?? list[0] ?? null;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Website widget</CardTitle>
              <CardDescription>
                Add a chat assistant for this project to your own website.
              </CardDescription>
            </div>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus aria-hidden />
              New widget
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="flex items-start gap-2 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{WIDGET_EXPLAINER}</span>
          </p>

          {widgets.isPending ? (
            <PanelSkeleton />
          ) : widgets.error ? (
            <ErrorNotice error={widgets.error} onRetry={() => void widgets.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No widgets yet"
              description="Create a widget, then paste one line of code on your website."
              action={
                <Button type="button" size="sm" onClick={openCreate}>
                  <Plus aria-hidden />
                  New widget
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2" aria-label="Widgets">
              {list.map((widget) => (
                <WidgetRow
                  key={widget.id}
                  widget={widget}
                  selected={selected?.id === widget.id}
                  onSelect={() => setSelectedId(widget.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <WidgetDetail
          key={selected.id}
          widget={selected}
          projectId={projectId}
          onEdit={() => {
            setEditing(selected);
            setFormOpen(true);
          }}
          onDeleted={() => setSelectedId(null)}
        />
      ) : null}

      <EmbedWidgetFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        widget={editing}
      />
    </div>
  );
}
