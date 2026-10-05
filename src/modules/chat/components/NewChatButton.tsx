"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { useCreateSession } from "../hooks";
import type { ChatSession } from "../schemas";
import { Button, Dialog, Input } from "@/shared/ui";

/**
 * "New chat" (item 31).
 *
 * The create dialog only takes a title; the model set is chosen on the session
 * screen (item 35) so a chat can be created before any model is registered —
 * which is exactly the state a fresh install is in.
 */
export function NewChatButton({ onCreated }: { onCreated: (session: ChatSession) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const create = useCreateSession();

  const close = () => {
    if (create.isPending) return;
    setOpen(false);
    setTitle("");
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} aria-label="New chat">
        <Plus aria-hidden />
        New
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="New chat"
        description="Give it a title, or leave it blank and rename it later."
        footer={
          <>
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={create.isPending}
              onClick={() =>
                create.mutate(
                  { title: title.trim() || undefined },
                  {
                    onSuccess: (session) => {
                      setOpen(false);
                      setTitle("");
                      onCreated(session);
                    },
                  },
                )
              }
            >
              Create chat
            </Button>
          </>
        }
      >
        <Input
          label="Title"
          value={title}
          maxLength={200}
          autoFocus
          placeholder="Untitled chat"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Dialog>
    </>
  );
}
