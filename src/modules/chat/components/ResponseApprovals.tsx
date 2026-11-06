"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, ShieldAlert, X } from "lucide-react";

import { chatKeys } from "../api";
import {
  approvalLabel,
  executionLink,
  summarizeInput,
  useDecideApproval,
  type ToolApproval,
} from "@/modules/mcp";
import { Badge, Button } from "@/shared/ui";

/**
 * Actions an answer's tool calls asked for. Additive, non-destructive ones
 * (`approvable_in_chat`: create event, save file, draft mail, append rows)
 * get Approve / Reject right here; anything that sends or overwrites only
 * links to the Integrations page, which always lists every approval too.
 */
export function ResponseApprovals({
  sessionId,
  approvals,
}: {
  sessionId: string;
  approvals: ToolApproval[];
}) {
  const queryClient = useQueryClient();
  const decide = useDecideApproval();

  if (approvals.length === 0) return null;

  const submit = (approvalId: string, decision: "approved" | "rejected") =>
    decide.mutate(
      { approvalId, decision: { decision } },
      {
        // The row now carries the decision and execution outcome.
        onSettled: () =>
          void queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) }),
      },
    );

  return (
    <ul className="mt-3 space-y-2" aria-label="Actions awaiting approval">
      {approvals.map((approval) => {
        const pending = approval.status === "pending";
        const busy = decide.isPending && decide.variables?.approvalId === approval.id;
        const summary = summarizeInput(approval.category, approval.proposed_input);
        const link = executionLink(approval.execution_output);

        return (
          <li key={approval.id} className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="size-4 text-warning" aria-hidden />
              <span className="font-medium text-foreground">{approvalLabel(approval)}</span>
              <DecisionBadge approval={approval} />
            </div>

            {summary ? (
              <p className="mt-1 break-words text-xs text-muted-foreground">{summary}</p>
            ) : null}

            {approval.execution_status === "failed" && approval.execution_error ? (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {approval.execution_error}
              </p>
            ) : null}

            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}

            {pending ? (
              approval.approvable_in_chat ? (
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => submit(approval.id, "approved")}
                    loading={busy && decide.variables?.decision.decision === "approved"}
                    disabled={busy}
                  >
                    <Check aria-hidden />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => submit(approval.id, "rejected")}
                    disabled={busy}
                  >
                    <X aria-hidden />
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  This action sends or overwrites data, so it must be approved on the{" "}
                  <Link href="/integrations" className="text-primary hover:underline">
                    Integrations page
                  </Link>
                  .
                </p>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function DecisionBadge({ approval }: { approval: ToolApproval }) {
  if (approval.status === "pending") return <Badge variant="neutral">Awaiting approval</Badge>;
  if (approval.status === "rejected") return <Badge variant="neutral">Rejected</Badge>;
  if (approval.status === "expired") return <Badge variant="neutral">Expired</Badge>;
  if (approval.execution_status === "completed") return <Badge variant="success">Done</Badge>;
  if (approval.execution_status === "failed" || approval.execution_status === "denied") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return <Badge variant="neutral">Approved</Badge>;
}
