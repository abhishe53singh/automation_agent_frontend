"use client";

import { ArrowUp, X } from "lucide-react";
import * as React from "react";

import { useModels } from "@/modules/llm/hooks";
import type { LlmModel } from "@/modules/llm/schemas";
import { Badge, Button, Dialog, Input, Switch, Textarea } from "@/shared/ui";

import { useCreateEmbedWidget, useUpdateEmbedWidget } from "../hooks";
import {
  HEX_COLOR_RE,
  embedWidgetCreateSchema,
  type EmbedWidget,
  type EmbedWidgetCreate,
  type EmbedWidgetUpdate,
} from "../schemas";
import { OriginChips } from "./OriginChips";

export const DEFAULT_ACCENT = "#4f46e5";

export interface WidgetFormValues {
  name: string;
  model_ids: string[];
  allowed_origins: string[];
  title: string;
  welcome_message: string;
  system_prompt: string;
  accent_color: string;
  is_active: boolean;
}

export function initialFormValues(widget?: EmbedWidget | null): WidgetFormValues {
  return {
    name: widget?.name ?? "",
    model_ids: widget?.model_ids ?? [],
    allowed_origins: widget?.allowed_origins ?? [],
    title: widget?.title ?? "",
    welcome_message: widget?.welcome_message ?? "",
    system_prompt: widget?.system_prompt ?? "",
    accent_color: widget?.accent_color ?? DEFAULT_ACCENT,
    is_active: widget?.is_active ?? true,
  };
}

/** Create body: empty optional text fields are omitted. */
export function toCreateBody(projectId: string, values: WidgetFormValues): EmbedWidgetCreate {
  const text = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    project_id: projectId,
    name: values.name.trim(),
    model_ids: values.model_ids,
    allowed_origins: values.allowed_origins,
    title: text(values.title),
    welcome_message: text(values.welcome_message),
    system_prompt: text(values.system_prompt),
    accent_color: values.accent_color,
    is_active: values.is_active,
  };
}

/** Update body: empty optional text fields are cleared (null). */
export function toUpdateBody(values: WidgetFormValues): EmbedWidgetUpdate {
  const text = (v: string) => (v.trim() ? v.trim() : null);
  return {
    name: values.name.trim(),
    model_ids: values.model_ids,
    allowed_origins: values.allowed_origins,
    title: text(values.title),
    welcome_message: text(values.welcome_message),
    system_prompt: text(values.system_prompt),
    accent_color: values.accent_color,
    is_active: values.is_active,
  };
}

function modelLabel(model: LlmModel | undefined, fallback: string): string {
  return model?.display_name?.trim() || model?.name || fallback;
}

function ModelPicker({
  models,
  value,
  onChange,
  error,
}: {
  models: LlmModel[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const byId = new Map(models.map((m) => [m.id, m]));
  const available = models.filter((m) => m.is_active && !value.includes(m.id));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor="embed-model-add">
        Models
      </label>
      {value.length > 0 ? (
        <ol className="space-y-1" aria-label="Selected models">
          {value.map((id, index) => {
            const label = modelLabel(byId.get(id), id);
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{label}</span>
                  {index === 0 ? <Badge variant="primary">Answers</Badge> : null}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {index > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange([id, ...value.filter((v) => v !== id)])}
                    >
                      <ArrowUp aria-hidden />
                      Make primary
                    </Button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove model ${label}`}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onChange(value.filter((v) => v !== id))}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      <select
        id="embed-model-add"
        aria-label="Add a model"
        value=""
        onChange={(event) => {
          if (event.target.value) onChange([...value, event.target.value]);
        }}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">
          {available.length
            ? "Add a model…"
            : value.length
              ? "All models added"
              : "No models registered"}
        </option>
        {available.map((m) => (
          <option key={m.id} value={m.id}>
            {modelLabel(m, m.id)}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          The first model answers visitors. Others are only used as fallbacks.
        </p>
      )}
    </div>
  );
}

export interface EmbedWidgetFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Present = edit mode. */
  widget?: EmbedWidget | null;
}

export function EmbedWidgetFormDialog({
  open,
  onClose,
  projectId,
  widget,
}: EmbedWidgetFormDialogProps) {
  if (!open) return null;
  // Remount per widget so the form state starts from the right values.
  return (
    <WidgetForm key={widget?.id ?? "new"} onClose={onClose} projectId={projectId} widget={widget} />
  );
}

type FieldErrors = Partial<Record<"name" | "model_ids" | "accent_color", string>>;

function WidgetForm({ onClose, projectId, widget }: Omit<EmbedWidgetFormDialogProps, "open">) {
  const models = useModels();
  const create = useCreateEmbedWidget();
  const update = useUpdateEmbedWidget();
  const [values, setValues] = React.useState<WidgetFormValues>(() => initialFormValues(widget));
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [hexDraft, setHexDraft] = React.useState(values.accent_color);
  const editing = Boolean(widget);
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof WidgetFormValues>(key: K, next: WidgetFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: next }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body = toCreateBody(projectId, values);
    const parsed = embedWidgetCreateSchema.safeParse(body);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "name" || key === "model_ids" || key === "accent_color") {
          next[key] ??= issue.message;
        }
      }
      setErrors(next);
      return;
    }
    setErrors({});
    if (widget) {
      update.mutate({ id: widget.id, patch: toUpdateBody(values) }, { onSuccess: onClose });
    } else {
      create.mutate(body, { onSuccess: onClose });
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Edit ${widget?.name ?? "widget"}` : "New website widget"}
      description="Visitors chat with this project's knowledge. Token usage is billed to your account."
      className="max-w-2xl"
    >
      <form className="space-y-4" onSubmit={submit} noValidate aria-label="Widget settings">
        <Input
          label="Name"
          placeholder="Support bot for shop.example.com"
          value={values.name}
          error={errors.name}
          hint="Only you see this."
          onChange={(e) => set("name", e.target.value)}
        />

        <ModelPicker
          models={models.data ?? []}
          value={values.model_ids}
          error={errors.model_ids}
          onChange={(next) => set("model_ids", next)}
        />

        <OriginChips
          value={values.allowed_origins}
          onChange={(next) => set("allowed_origins", next)}
        />

        <Input
          label="Header title"
          placeholder="Ask us anything"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="embed-welcome" className="text-sm font-medium text-foreground">
            Welcome message
          </label>
          <Textarea
            id="embed-welcome"
            rows={2}
            maxRows={4}
            placeholder="Hi! How can we help today?"
            value={values.welcome_message}
            onChange={(e) => set("welcome_message", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="embed-system" className="text-sm font-medium text-foreground">
            Business instructions
          </label>
          <Textarea
            id="embed-system"
            rows={4}
            maxRows={10}
            placeholder="You are the assistant for Example Shop. Be concise and answer only about our products and policies."
            value={values.system_prompt}
            onChange={(e) => set("system_prompt", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Visitors never see these instructions.</p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="embed-accent" className="text-sm font-medium text-foreground">
              Accent colour
            </label>
            <div className="flex items-start gap-2">
              <input
                id="embed-accent"
                type="color"
                value={
                  HEX_COLOR_RE.test(values.accent_color) ? values.accent_color : DEFAULT_ACCENT
                }
                onChange={(e) => {
                  set("accent_color", e.target.value);
                  setHexDraft(e.target.value);
                }}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
              />
              <div className="w-32">
                <Input
                  aria-label="Accent colour hex"
                  value={hexDraft}
                  error={errors.accent_color}
                  className="font-mono"
                  onChange={(e) => {
                    setHexDraft(e.target.value);
                    set("accent_color", e.target.value.trim());
                  }}
                />
              </div>
            </div>
          </div>
          <div className="pb-2">
            <Switch
              label="Active"
              checked={values.is_active}
              onCheckedChange={(checked) => set("is_active", checked)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {editing ? "Save changes" : "Create widget"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
