"use client";

import { useState } from "react";
import { Mail, Server, Trash2, Edit2, CheckCircle2, AlertTriangle, Plus } from "lucide-react";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";

import { type EmailAccountOut } from "../schemas";
import { useDeleteEmailAccount, useTestEmailAccount } from "../hooks";
import { MailboxHealthCard } from "./MailboxHealthCard";
import { MailboxForm } from "./MailboxForm";

interface MailboxListProps {
  accounts: EmailAccountOut[];
  onOpenCreate: () => void;
}

export function MailboxList({ accounts, onOpenCreate }: MailboxListProps) {
  const [editingAccount, setEditingAccount] = useState<EmailAccountOut | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useDeleteEmailAccount();
  const testMutation = useTestEmailAccount();

  if (!accounts || accounts.length === 0) {
    return (
      <EmptyState
        icon={<Mail className="h-10 w-10 text-muted-foreground" />}
        title="No mailboxes connected yet"
        description="Connect your business email via SMTP/IMAP to enable automated cold outreach campaigns and reply tracking."
        action={
          <Button onClick={onOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Connect First Mailbox</span>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {accounts.map((acc) => (
          <div key={acc.id} className="space-y-4">
            <Card className="p-5 space-y-4 border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {acc.label}
                      </h3>
                      {acc.is_verified ? (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[11px] py-0">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[11px] py-0">
                          Unverified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {acc.from_name} &lt;{acc.from_email}&gt;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingAccount(acc)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeletingId(acc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Server Info pills */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-2 py-1">
                  <Server className="h-3.5 w-3.5" />
                  <span>SMTP: {acc.smtp_host}:{acc.smtp_port}</span>
                </span>
                {acc.imap_host && (
                  <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-2 py-1">
                    <Server className="h-3.5 w-3.5" />
                    <span>IMAP: {acc.imap_host}:{acc.imap_port}</span>
                  </span>
                )}
                <span className="inline-flex items-center rounded bg-muted/40 px-2 py-1">
                  Limit: {acc.daily_send_limit}/day
                </span>
              </div>
            </Card>

            {/* Health Card */}
            <MailboxHealthCard accountId={acc.id} />
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingAccount && (
        <MailboxForm
          open={Boolean(editingAccount)}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          initialData={editingAccount}
          onSubmit={async () => {
            setEditingAccount(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Mailbox Account"
        description="Are you sure you want to disconnect this mailbox? Ongoing campaigns linked to this account will be paused."
        confirmLabel="Delete Account"
        variant="destructive"
        onConfirm={async () => {
          if (deletingId) {
            await deleteMutation.mutateAsync(deletingId);
            setDeletingId(null);
          }
        }}
      />
    </div>
  );
}
