"use client";

import { AlertCircle, CheckCircle2, Mail, Reply } from "lucide-react";

import { Dialog } from "@/shared/ui/Dialog";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useSentEmailsForLead } from "../hooks";

/**
 * Centered popup with ONLY the emails the campaign sent one lead: the initial
 * email and each follow-up, in order. Replies live in the Inbox tab. Bodies
 * come back with tracking removed and render sandboxed, so viewing them never
 * counts as an open or click.
 */
export function LeadSentEmailsDialog({
  campaignId,
  sendId,
  leadLabel,
  onClose,
}: {
  campaignId: string;
  sendId: string | null;
  leadLabel?: string | null;
  onClose: () => void;
}) {
  const { data: emails, isLoading, isError } = useSentEmailsForLead(campaignId, sendId);

  return (
    <Dialog
      open={Boolean(sendId)}
      onClose={onClose}
      title={leadLabel ? `Emails sent to ${leadLabel}` : "Emails sent"}
      description="Every email of this campaign's sequence that went to this lead, in order."
      className="max-w-3xl"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {isLoading ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load the emails.</p>
        ) : !emails || emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been sent to this lead yet.</p>
        ) : (
          emails.map((email, i) => {
            const failed = email.status === "failed";
            return (
              <section key={`${email.step_number}-${i}`} className="rounded-lg border border-border bg-card">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    {email.step_number === 1 ? (
                      <Mail className="h-3.5 w-3.5 text-primary" aria-hidden />
                    ) : (
                      <Reply className="h-3.5 w-3.5 text-primary" aria-hidden />
                    )}
                    <span>{email.step_number === 1 ? "Initial email" : `Follow-up ${email.step_number - 1}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {failed ? (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                    )}
                    <span className={failed ? "text-rose-500" : undefined}>{failed ? "Failed" : "Delivered"}</span>
                    {email.sent_at ? (
                      <span>
                        {" · "}
                        {new Date(email.sent_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    ) : null}
                  </div>
                </header>
                <div className="space-y-2 p-3">
                  <div className="text-sm font-medium text-foreground">{email.subject || "(no subject)"}</div>
                  {failed && email.error ? <p className="text-xs text-rose-500">{email.error}</p> : null}
                  {email.body_html ? (
                    <iframe
                      title={`Email ${i + 1} body`}
                      // No scripts, no navigation: shown exactly as sent, minus tracking.
                      sandbox=""
                      srcDoc={`<!doctype html><html><body style="margin:0;padding:12px;background:#fff;font-family:system-ui,sans-serif;font-size:14px;color:#1f2937">${email.body_html}</body></html>`}
                      className="h-64 w-full rounded border border-border bg-white"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">No body stored.</p>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </Dialog>
  );
}
