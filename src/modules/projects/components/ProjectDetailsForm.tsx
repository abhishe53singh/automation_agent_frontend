"use client";

import * as React from "react";

import { projectUpdateSchema } from "../api";
import { canEdit } from "../rbac";
import { useUpdateProject } from "../hooks";
import type { Project } from "../schemas";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/shared/ui";

/**
 * Project detail editor (item 22).
 *
 * Partial PATCH with EXPLICIT nulls: the form tracks which nullable fields the
 * user actually edited, and only those are sent. A field left untouched is
 * omitted from the payload; a field emptied by the user is sent as `null`,
 * which upstream interprets as "clear". Without that distinction, simply
 * opening the form and saving would wipe the description.
 *
 * The seed state is keyed on `updated_at` (the `key` on the inner component) so
 * a newer server version resets the form WITHOUT a setState-in-effect cascade.
 */
/**
 * Form state seeded from the project, keyed on `updated_at`.
 *
 * Keying the subcomponent on `updated_at` remounts it when the server returns a
 * newer version, which resets the fields without a setState-in-effect cascade.
 */
export function ProjectDetailsForm({ project }: { project: Project }) {
  return <ProjectDetailsFormFields key={project.updated_at} project={project} />;
}

function ProjectDetailsFormFields({ project }: { project: Project }) {
  const editable = canEdit(project);
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description ?? "");
  const [instructions, setInstructions] = React.useState(project.instructions ?? "");
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [error, setError] = React.useState<string | undefined>();

  const update = useUpdateProject(project.id);

  const mark = (field: string) => setTouched((current) => ({ ...current, [field]: true }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = { name };

    if (touched.description) {
      payload.description = description.trim() ? description.trim() : null;
    }
    if (touched.instructions) {
      payload.instructions = instructions.trim() ? instructions.trim() : null;
    }

    const parsed = projectUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setError(undefined);
    update.mutate(parsed.data, { onSuccess: () => setTouched({}) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project details</CardTitle>
        <CardDescription>
          {editable
            ? "Only the fields you change are sent. Emptying a field clears it."
            : "You have read-only access to these settings."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            maxLength={150}
            disabled={!editable}
            error={error}
            hint="1–150 characters."
            onChange={(event) => {
              setName(event.target.value);
              mark("name");
            }}
          />

          <TextAreaField
            label="Description"
            value={description}
            maxLength={2000}
            disabled={!editable}
            placeholder="Short summary shown on the project card."
            onChange={(value) => {
              setDescription(value);
              mark("description");
            }}
          />

          <TextAreaField
            label="Instructions"
            value={instructions}
            maxLength={20000}
            rows={8}
            disabled={!editable}
            placeholder="System instructions applied to chats in this project."
            onChange={(value) => {
              setInstructions(value);
              mark("instructions");
            }}
          />

          {editable ? (
            <div className="flex items-center gap-3">
              <Button type="submit" loading={update.isPending}>
                Save changes
              </Button>
              {update.isSuccess && !update.isPending ? (
                <span className="text-xs text-muted-foreground">Saved.</span>
              ) : null}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  maxLength,
  rows = 4,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-xs text-muted-foreground">
        {value.length} / {maxLength}
      </span>
    </div>
  );
}
