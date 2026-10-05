"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { projectCreateSchema } from "../api";
import { useCreateProject } from "../hooks";
import { Button, Dialog, Input } from "@/shared/ui";

/** Create-project dialog (item 22). Client-side limits mirror the upstream ones. */
export function CreateProjectDialog({ triggerLabel = "New project" }: { triggerLabel?: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  const create = useCreateProject();

  const reset = () => {
    setName("");
    setDescription("");
    setError(undefined);
  };

  const close = () => {
    if (create.isPending) return;
    setOpen(false);
    reset();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = projectCreateSchema.safeParse({
      name,
      description: description.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setError(undefined);
    create.mutate(parsed.data, { onSuccess: close });
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {triggerLabel}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="New project"
        description="Projects scope your chats, files and knowledge bases, and define who can see them."
        footer={
          <>
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} loading={create.isPending}>
              Create project
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            maxLength={150}
            required
            autoFocus
            placeholder="Customer support"
            error={error}
            hint="1–150 characters."
            onChange={(event) => setName(event.target.value)}
          />
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Description</span>
            <textarea
              value={description}
              maxLength={2000}
              rows={3}
              placeholder="What is this project for?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="text-xs text-muted-foreground">Optional, up to 2000 characters.</span>
          </label>
          {/* Enter submits without a visible duplicate control. */}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Dialog>
    </>
  );
}
