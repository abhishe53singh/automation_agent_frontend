"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { providerCreateSchema } from "../schemas";
import { useCreateProvider } from "../hooks";
import { Button, Dialog, Input } from "@/shared/ui";

/**
 * Create-provider dialog (item 25). `api_key_env` is the NAME of a server-side
 * environment variable (e.g. OPENAI_API_KEY) — the secret itself is never typed
 * into, stored in, or sent from the browser.
 */
export function ProviderDialog() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    display_name: "",
    base_url: "",
    api_key_env: "",
  });
  const [error, setError] = React.useState<string | undefined>();

  const create = useCreateProvider();

  const close = () => {
    if (create.isPending) return;
    setOpen(false);
    setForm({ name: "", display_name: "", base_url: "", api_key_env: "" });
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
        description="Models are registered under a provider. Leave the base URL empty for the vendor default."
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
            placeholder="openai"
            hint="Lowercase identifier, unique across the registry."
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
            label="API key env var"
            value={form.api_key_env}
            placeholder="OPENAI_API_KEY"
            hint="The name of a server-side environment variable holding the key — never the key itself."
            onChange={(event) => field("api_key_env")(event.target.value)}
          />
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Dialog>
    </>
  );
}
