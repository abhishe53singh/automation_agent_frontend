"use client";

import { useState } from "react";
import { MailCheck, Plus } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useEmailAccounts, useCreateEmailAccount } from "@/modules/email/hooks";
import { MailboxList } from "@/modules/email/components/MailboxList";
import { MailboxForm } from "@/modules/email/components/MailboxForm";

export default function MailboxesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: accounts, isLoading } = useEmailAccounts();
  const createMutation = useCreateEmailAccount();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Mailbox Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure SMTP dispatch and IMAP response tracking accounts for warmups and cold outreach.
          </p>
        </div>

        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Connect Mailbox</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <MailboxList
          accounts={accounts || []}
          onOpenCreate={() => setFormOpen(true)}
        />
      )}

      <MailboxForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
