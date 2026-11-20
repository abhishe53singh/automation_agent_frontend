"use client";

import { use, useState } from "react";
import {
  MailCheck,
  CheckCircle2,
  Plus,
  ArrowRightLeft,
  Server,
  Unlink,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Skeleton } from "@/shared/ui/Skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/Dialog";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import {
  useEmailAccounts,
  useCreateEmailAccount,
  useEmailCampaign,
  useUpdateEmailCampaign,
} from "@/modules/email/hooks";
import { MailboxHealthCard } from "@/modules/email/components/MailboxHealthCard";
import { MailboxForm } from "@/modules/email/components/MailboxForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignMailboxSubTabPage({ params }: PageProps) {
  const { id: campaignId } = use(params);
  const [formOpen, setFormOpen] = useState(false);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const { data: campaign, isLoading: campaignLoading } = useEmailCampaign(campaignId);
  const { data: accounts, isLoading: accountsLoading } = useEmailAccounts();
  const updateCampaignMutation = useUpdateEmailCampaign(campaignId);
  const createAccountMutation = useCreateEmailAccount();

  const isLoading = campaignLoading || accountsLoading;

  // The account assigned to this campaign
  const assignedAccount =
    accounts?.find((acc) => acc.id === campaign?.account_id) || null;

  const handleAssignMailbox = async (accountId: string) => {
    try {
      await updateCampaignMutation.mutateAsync({ account_id: accountId });
      setSelectModalOpen(false);
      toast.success("Mailbox assigned to campaign!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign mailbox");
    }
  };

  const handleUnassignMailbox = async () => {
    try {
      await updateCampaignMutation.mutateAsync({ account_id: null });
      setConfirmUnassignOpen(false);
      toast.success("Mailbox removed from this campaign");
    } catch (err: any) {
      toast.error(err?.message || "Failed to unassign mailbox");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Campaign Sending Mailbox</span>
            {assignedAccount && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[11px] font-normal py-0">
                Connected
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            SMTP dispatch server and IMAP response listener allocated for this campaign.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {accounts && accounts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedAccountId(assignedAccount?.id || accounts[0]?.id || "");
                setSelectModalOpen(true);
              }}
              className="gap-1.5"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>{assignedAccount ? "Change Mailbox" : "Assign Mailbox"}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setFormOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Mailbox</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : assignedAccount ? (
        /* State 1: Mailbox IS currently assigned */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4 border-border flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MailCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {assignedAccount.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Active sender for this campaign
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                  Active Mailbox
                </Badge>
              </div>

              <div className="space-y-2 text-sm pt-2">
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Sender:</span>
                  <span className="font-medium text-foreground">
                    {assignedAccount.from_name} &lt;{assignedAccount.from_email}&gt;
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">SMTP Server:</span>
                  <span className="font-medium text-foreground">
                    {assignedAccount.smtp_host}:{assignedAccount.smtp_port}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">IMAP Server:</span>
                  <span className="font-medium text-foreground">
                    {assignedAccount.imap_host
                      ? `${assignedAccount.imap_host}:${assignedAccount.imap_port}`
                      : "Not configured"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Daily Limit:</span>
                  <span className="font-medium text-foreground">
                    {assignedAccount.daily_send_limit} emails / day
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAccountId(assignedAccount.id);
                  setSelectModalOpen(true);
                }}
                className="gap-1.5 text-xs"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Switch Mailbox</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmUnassignOpen(true)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Unlink className="h-3.5 w-3.5 mr-1" />
                <span>Unassign</span>
              </Button>
            </div>
          </Card>

          <MailboxHealthCard accountId={assignedAccount.id} />
        </div>
      ) : (
        /* State 2: NO mailbox assigned to this campaign */
        <Card className="p-8 border-border">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mx-auto">
              <MailCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                No Sending Mailbox Assigned
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Outreach emails require an allocated mailbox to dispatch dispatches and capture lead replies.
              </p>
            </div>

            {accounts && accounts.length > 0 ? (
              <div className="pt-4 space-y-4 text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose from your connected mailboxes:
                </div>
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-4 rounded-lg border border-border bg-card/80 hover:border-primary/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {acc.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({acc.from_email})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          SMTP: {acc.smtp_host}:{acc.smtp_port} • Limit: {acc.daily_send_limit} / day
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAssignMailbox(acc.id)}
                        disabled={updateCampaignMutation.isPending}
                        className="gap-1.5 shrink-0"
                      >
                        <Check className="h-4 w-4" />
                        <span>Assign to Campaign</span>
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormOpen(true)}
                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Or connect a new SMTP/IMAP account</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Button onClick={() => setFormOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Connect Your First Mailbox</span>
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Dialog: Change / Switch Mailbox */}
      <Dialog
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <span>Select Sending Mailbox</span>
            </DialogTitle>
            <DialogDescription>
              Choose which connected email account will be used to send dispatches for this campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3 max-h-72 overflow-y-auto">
            {accounts?.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              const isCurrent = assignedAccount?.id === acc.id;

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-border/80 bg-card/60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {acc.label}
                      </span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {acc.from_email} • {acc.smtp_host}
                    </p>
                  </div>

                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectModalOpen(false);
                setFormOpen(true);
              }}
              className="text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Account</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleAssignMailbox(selectedAccountId)}
                disabled={!selectedAccountId || updateCampaignMutation.isPending}
              >
                {updateCampaignMutation.isPending ? "Assigning..." : "Confirm Mailbox"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Connect New Mailbox */}
      <MailboxForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (values) => {
          const created = await createAccountMutation.mutateAsync(values);
          if (created?.id) {
            await updateCampaignMutation.mutateAsync({ account_id: created.id });
            toast.success("Mailbox connected and assigned to this campaign!");
          }
        }}
        isLoading={createAccountMutation.isPending || updateCampaignMutation.isPending}
      />

      {/* Confirm Unassign Dialog */}
      <ConfirmDialog
        open={confirmUnassignOpen}
        onOpenChange={setConfirmUnassignOpen}
        title="Unassign Mailbox from Campaign"
        description="Are you sure you want to detach this mailbox? The campaign will not be able to dispatch emails until a sending mailbox is assigned."
        confirmLabel="Unassign Mailbox"
        variant="destructive"
        onConfirm={handleUnassignMailbox}
      />
    </div>
  );
}
