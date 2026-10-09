"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { providerCreateSchema } from "../schemas";
import { useCreateProvider } from "../hooks";
import { Button, Dialog, Input } from "@/shared/ui";

/**
 * Create-provider dialog (item 25). `api_key` is the actual key, stored
 * securely in the DB and never returned by the API (the response only carries
 * `has_api_key`). `api_key_env` remains as a legacy fallback: the NAME of a
 * server-side environment variable (e.g. OPENAI_API_KEY).
 */
export function ProviderDialog() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    display_name: "",
    base_url: "",
    api_key: "",
    api_key_env: "",
  });
  const [error, setError] = React.useState<string | undefined>();

  const create = useCreateProvider();

  const close = () => {
    if (create.isPending) return;
    setOpen(false);
    setForm({ name: "", display_name: "", base_url: "", api_key: "", api_key_env: "" });
    setError(undefined);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = providerCreateSchema.safeParse(form);
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
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Add provider
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Add a provider"
        description="Models are registered under a provider. Store an API key (kept securely in the DB) or name an env var as fallback. Leave the base URL empty for the vendor default."
        footer={
          <>
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} loading={create.isPending}>
              Create provider
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            required
            autoFocus
            error={error}
            placeholder="openrouter"
            hint="Free-text identifier, unique across the registry — e.g. openrouter, my-claude, company-gpt4."
            onChange={(event) => field("name")(event.target.value)}
          />
          <Input
            label="Display name"
            value={form.display_name}
            placeholder="OpenAI"
            onChange={(event) => field("display_name")(event.target.value)}
          />
          <Input
            label="Base URL"
            value={form.base_url}
            placeholder="https://api.openai.com/v1"
            onChange={(event) => field("base_url")(event.target.value)}
          />
          <Input
            label="API Key (stored securely in DB)"
            type="password"
            autoComplete="new-password"
            value={form.api_key}
            placeholder="sk-..."
            hint="Preferred — the real key, stored securely in the DB and never returned to the browser."
            onChange={(event) => field("api_key")(event.target.value)}
          />
          <Input
            label="API Key Env Var Name (optional, e.g. OPENAI_API_KEY)"
            value={form.api_key_env}
            placeholder="OPENAI_API_KEY"
            hint="Fallback: the name of a server-side environment variable holding the key. Provide this or an API Key above."
            onChange={(event) => field("api_key_env")(event.target.value)}
          />
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Dialog>
    </>
  );
}
