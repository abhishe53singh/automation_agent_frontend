"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { modelCreateSchema } from "../schemas";
import { useCreateModel } from "../hooks";
import { Button, Dialog, Input, Select } from "@/shared/ui";

/** Create-model dialog (item 25). Costs are entered per MILLION tokens. */
export function ModelDialog({
  providers,
  disabled = false,
}: {
  providers: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    provider_id: "",
    name: "",
    display_name: "",
    input_cost_per_million: "0.00",
    output_cost_per_million: "0.00",
    context_window: "",
    max_output_tokens: "",
  });
  const [error, setError] = React.useState<string | undefined>();

  const create = useCreateModel();

  const close = () => {
    if (create.isPending) return;
    setOpen(false);
    setError(undefined);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = modelCreateSchema.safeParse({
      provider_id: form.provider_id,
      name: form.name,
      display_name: form.display_name || undefined,
      input_cost_per_million: form.input_cost_per_million,
      output_cost_per_million: form.output_cost_per_million,
      context_window: form.context_window,
      max_output_tokens: form.max_output_tokens,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setError(undefined);
    create.mutate(parsed.data, { onSuccess: close });
  };

  const field = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || providers.length === 0}
        title={disabled ? "Add a provider first." : undefined}
      >
        <Plus aria-hidden />
        Add model
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Add a model"
        description="Costs are per million tokens and feed the usage totals on the dashboard."
        footer={
          <>
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} loading={create.isPending}>
              Create model
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Select
            label="Provider"
            value={form.provider_id}
            required
            error={error}
            onChange={(event) => field("provider_id")(event.target.value)}
          >
            <option value="">Choose a provider…</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>
          <Input
            label="Name"
            value={form.name}
            required
            maxLength={255}
            placeholder="meta/llama-3.1-8b-instruct:free"
            hint="Plain model ID, unique within the provider — slashes, colons and dots allowed (e.g. gpt-4o, claude-3-5-sonnet-20241022, meta/llama-3.1-8b-instruct:free)."
            onChange={(event) => field("name")(event.target.value)}
          />
          <Input
            label="Display name"
            value={form.display_name}
            placeholder="GPT-4o mini"
            onChange={(event) => field("display_name")(event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Input cost / 1M"
              value={form.input_cost_per_million}
              inputMode="decimal"
              onChange={(event) => field("input_cost_per_million")(event.target.value)}
            />
            <Input
              label="Output cost / 1M"
              value={form.output_cost_per_million}
              inputMode="decimal"
              onChange={(event) => field("output_cost_per_million")(event.target.value)}
            />
            <Input
              label="Context window"
              value={form.context_window}
              inputMode="numeric"
              placeholder="128000"
              onChange={(event) => field("context_window")(event.target.value)}
            />
            <Input
              label="Max output tokens"
              value={form.max_output_tokens}
              inputMode="numeric"
              placeholder="16384"
              onChange={(event) => field("max_output_tokens")(event.target.value)}
            />
          </div>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Dialog>
    </>
  );
}
