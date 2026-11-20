"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, Server, ShieldCheck, KeyRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";
import {
  EmailAccountCreateSchema,
  type EmailAccountCreate,
  type EmailAccountOut,
} from "../schemas";

interface MailboxFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EmailAccountCreate) => Promise<void>;
  initialData?: EmailAccountOut | null;
  isLoading?: boolean;
}

export function MailboxForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: MailboxFormProps) {
  const [includeImap, setIncludeImap] = useState(
    Boolean(initialData?.imap_host)
  );

  const form = useForm<EmailAccountCreate>({
    resolver: zodResolver(EmailAccountCreateSchema),
    defaultValues: {
      label: initialData?.label || "",
      from_name: initialData?.from_name || "",
      from_email: initialData?.from_email || "",
      smtp_host: initialData?.smtp_host || "",
      smtp_port: initialData?.smtp_port || 587,
      smtp_username: initialData?.smtp_username || "",
      smtp_password: "",
      smtp_use_tls: initialData?.smtp_use_tls ?? true,
      imap_host: initialData?.imap_host || "",
      imap_port: initialData?.imap_port || 993,
      imap_username: initialData?.imap_username || "",
      imap_password: "",
      imap_use_ssl: initialData?.imap_use_ssl ?? true,
      daily_send_limit: initialData?.daily_send_limit || 200,
    },
  });

  const handleSubmit = async (values: EmailAccountCreate) => {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-primary" />
            <DialogTitle>
              {initialData ? "Edit Mailbox Account" : "Connect New Mailbox"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Configure SMTP credentials for automated sending and IMAP for incoming response classification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 pt-2">
          {/* General Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              General Identity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Label</label>
                <Input placeholder="e.g. Sales Outreach Gmail" {...form.register("label")} />
                {form.formState.errors.label && (
                  <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">From Display Name</label>
                <Input placeholder="e.g. John Doe" {...form.register("from_name")} />
                {form.formState.errors.from_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.from_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">From Email Address</label>
                <Input type="email" placeholder="sender@yourdomain.com" {...form.register("from_email")} />
                {form.formState.errors.from_email && (
                  <p className="text-xs text-destructive">{form.formState.errors.from_email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Daily Send Limit</label>
                <Input type="number" {...form.register("daily_send_limit")} />
                {form.formState.errors.daily_send_limit && (
                  <p className="text-xs text-destructive">{form.formState.errors.daily_send_limit.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* SMTP Section */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <Server className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                SMTP Dispatch Server
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-foreground">SMTP Host</label>
                <Input placeholder="smtp.gmail.com" {...form.register("smtp_host")} />
                {form.formState.errors.smtp_host && (
                  <p className="text-xs text-destructive">{form.formState.errors.smtp_host.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Port</label>
                <Input type="number" placeholder="587" {...form.register("smtp_port")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">SMTP Username</label>
                <Input placeholder="user@gmail.com" {...form.register("smtp_username")} />
                {form.formState.errors.smtp_username && (
                  <p className="text-xs text-destructive">{form.formState.errors.smtp_username.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {initialData ? "New SMTP Password (optional)" : "SMTP Password / App Key"}
                </label>
                <Input type="password" placeholder="••••••••" {...form.register("smtp_password")} />
                {form.formState.errors.smtp_password && (
                  <p className="text-xs text-destructive">{form.formState.errors.smtp_password.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={form.watch("smtp_use_tls")}
                onCheckedChange={(checked) => form.setValue("smtp_use_tls", checked)}
              />
              <span className="text-xs text-muted-foreground">Enable TLS encryption (recommended)</span>
            </div>
          </div>

          {/* IMAP Section Toggle */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  IMAP Reply Listener
                </h4>
              </div>
              <Switch
                checked={includeImap}
                onCheckedChange={(checked) => setIncludeImap(checked)}
              />
            </div>

            {includeImap && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-foreground">IMAP Host</label>
                    <Input placeholder="imap.gmail.com" {...form.register("imap_host")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Port</label>
                    <Input type="number" placeholder="993" {...form.register("imap_port")} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">IMAP Username</label>
                    <Input placeholder="user@gmail.com" {...form.register("imap_username")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">IMAP Password</label>
                    <Input type="password" placeholder="••••••••" {...form.register("imap_password")} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              <KeyRound className="h-4 w-4" />
              <span>{isLoading ? "Saving..." : initialData ? "Save Changes" : "Connect Account"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
