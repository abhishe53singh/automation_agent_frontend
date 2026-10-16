"use client";

import * as React from "react";
import { Check, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { useApprovals, useDecideApproval } from "../hooks";
import type { ToolApproval } from "../schemas";
import {
  AsyncBoundary,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@/shared/ui";

const STATUS_VARIANTS = {
  pending: "neutral",
  approved: "success",
  rejected: "destructive",
  expired: "neutral",
} as const;

export function ApprovalConfirmationList() {
  const approvals = useApprovals();
  const decide = useDecideApproval();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <CardTitle>Tool Execution Approvals</CardTitle>
          </div>
          <Badge variant="neutral">
            {approvals.data?.filter((a) => a.status === "pending").length ?? 0} pending
          </Badge>
        </div>
        <CardDescription>
          High-privilege tool invocations requiring human confirmation before execution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          isPending={approvals.isPending}
          error={approvals.error}
          isEmpty={!approvals.data || approvals.data.length === 0}
          skeleton={
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="rounded border border-border p-4 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          }
          empty={
            <EmptyState
              icon={CheckCircle2}
              title="No pending approvals"
              description="Tools set to 'requires_confirmation' will queue here when invoked."
            />
          }
          errorTitle="Couldn't load approvals"
          onRetry={() => void approvals.refetch()}
        >
          <div className="space-y-3">
            {(approvals.data ?? []).map((approval: ToolApproval) => {
              const variant =
                STATUS_VARIANTS[approval.status as keyof typeof STATUS_VARIANTS] ?? "neutral";
              const isPending = approval.status === "pending";

              return (
                <div
                  key={approval.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 bg-card transition-colors md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{approval.tool_name}</span>
                      <Badge variant={variant} className="text-[10px] capitalize">
                        {approval.status}
                      </Badge>
                    </div>
                    {approval.reason && (
                      <p className="text-xs text-muted-foreground">{approval.reason}</p>
                    )}
                    {approval.proposed_input && Object.keys(approval.proposed_input).length > 0 && (
                      <pre className="mt-1 max-w-lg overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(approval.proposed_input, null, 2)}
                      </pre>
                    )}
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={decide.isPending}
                        onClick={() =>
                          decide.mutate({
                            approvalId: approval.id,
                            decision: { decision: "rejected" },
                          })
                        }
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={decide.isPending}
                        onClick={() =>
                          decide.mutate({
                            approvalId: approval.id,
                            decision: { decision: "approved" },
                          })
                        }
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}

