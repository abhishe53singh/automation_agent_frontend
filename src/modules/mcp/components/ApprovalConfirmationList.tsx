"use client";

import * as React from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  HardDrive,
  History,
  Mail,
  MessageSquare,
  Sheet,
  ShieldAlert,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApprovals, useDecideApproval } from "../hooks";
import type { ToolApproval } from "../schemas";
import {
  approvalLabel,
  executionLink,
  groupApprovals,
  splitApprovals,
  summarizeInput,
  type ApprovalCategory,
  type ApprovalGroup,
} from "../approval-groups";
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
  RelativeTime,
  Skeleton,
} from "@/shared/ui";

const STATUS_VARIANTS = {
  pending: "neutral",
  approved: "success",
  rejected: "destructive",
  expired: "neutral",
} as const;

const EXECUTION_BADGES = {
  completed: { variant: "success", label: "Completed" },
  failed: { variant: "destructive", label: "Failed" },
  denied: { variant: "neutral", label: "Denied" },
} as const;

const CATEGORY_ICONS: Record<ApprovalCategory, LucideIcon> = {
  mail: Mail,
  calendar: Calendar,
  drive: HardDrive,
  sheets: Sheet,
  docs: FileText,
  other: Wrench,
};

/** History rows shown per group before "Show all". */
const HISTORY_PREVIEW = 10;

export function ApprovalConfirmationList() {
  const approvals = useApprovals();
  const decide = useDecideApproval();

  const { pendingGroups, historyGroups, pendingCount } = React.useMemo(() => {
    const { pending, history } = splitApprovals(approvals.data ?? []);
    return {
      pendingGroups: groupApprovals(pending),
      historyGroups: groupApprovals(history),
      pendingCount: pending.length,
    };
  }, [approvals.data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            <CardTitle>Tool Execution Approvals</CardTitle>
          </div>
          <Badge variant="neutral">{pendingCount} pending</Badge>
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
              title="No approvals yet"
              description="Tools set to 'requires_confirmation' will queue here when invoked."
            />
          }
          errorTitle="Couldn't load approvals"
          onRetry={() => void approvals.refetch()}
        >
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Pending</h3>
              {pendingGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing is waiting for approval.</p>
              ) : (
                pendingGroups.map((group) => (
                  <GroupSection key={group.category} group={group}>
                    {group.items.map((approval) => (
                      <PendingRow
                        key={approval.id}
                        approval={approval}
                        disabled={decide.isPending}
                        onDecide={(decision) =>
                          decide.mutate({ approvalId: approval.id, decision: { decision } })
                        }
                      />
                    ))}
                  </GroupSection>
                ))
              )}
            </section>

            {historyGroups.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">History</h3>
                </div>
                {historyGroups.map((group) => (
                  <HistoryGroup key={group.category} group={group} />
                ))}
              </section>
            )}
          </div>
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}

function GroupSection({
  group,
  count,
  children,
}: {
  group: ApprovalGroup;
  count?: number;
  children: React.ReactNode;
}) {
  const Icon = CATEGORY_ICONS[group.category];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{group.label}</span>
        <span>({count ?? group.items.length})</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ApprovalSummary({ approval }: { approval: ToolApproval }) {
  const summary = summarizeInput(approval.category, approval.proposed_input);
  return (
    <>
      {summary && (
        <p className="break-all font-mono text-[11px] text-muted-foreground">{summary}</p>
      )}
      {approval.reason && <p className="text-xs text-muted-foreground">{approval.reason}</p>}
    </>
  );
}

function PendingRow({
  approval,
  disabled,
  onDecide,
}: {
  approval: ToolApproval;
  disabled: boolean;
  onDecide: (decision: "approved" | "rejected") => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 bg-card transition-colors md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">{approvalLabel(approval)}</span>
          <Badge variant="neutral" className="text-[10px] capitalize">
            {approval.status}
          </Badge>
          {approval.approvable_in_chat && (
            <Badge variant="info" className="text-[10px]">
              <MessageSquare /> Can approve in chat
            </Badge>
          )}
          <RelativeTime dateTime={approval.created_at} className="text-[11px]" />
        </div>
        <ApprovalSummary approval={approval} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          disabled={disabled}
          onClick={() => onDecide("rejected")}
        >
          <X className="h-4 w-4 mr-1" /> Reject
        </Button>
        <Button
          size="sm"
          className="bg-success text-success-foreground hover:bg-success/90"
          disabled={disabled}
          onClick={() => onDecide("approved")}
        >
          <Check className="h-4 w-4 mr-1" /> Approve
        </Button>
      </div>
    </div>
  );
}

function HistoryGroup({ group }: { group: ApprovalGroup }) {
  const [showAll, setShowAll] = React.useState(false);
  const total = group.items.length;
  const visible = showAll ? group.items : group.items.slice(0, HISTORY_PREVIEW);

  return (
    <GroupSection group={group} count={total}>
      {visible.map((approval) => (
        <HistoryRow key={approval.id} approval={approval} />
      ))}
      {total > HISTORY_PREVIEW && (
        <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show less" : `Show all (${total})`}
        </Button>
      )}
    </GroupSection>
  );
}

function HistoryRow({ approval }: { approval: ToolApproval }) {
  const variant = STATUS_VARIANTS[approval.status as keyof typeof STATUS_VARIANTS] ?? "neutral";
  const execution = approval.execution_status
    ? EXECUTION_BADGES[approval.execution_status as keyof typeof EXECUTION_BADGES]
    : undefined;
  const link = executionLink(approval.execution_output);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-card md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{approvalLabel(approval)}</span>
          <Badge variant={variant} className="text-[10px] capitalize">
            {approval.status}
          </Badge>
          {execution && (
            <Badge variant={execution.variant} className="text-[10px]">
              {execution.label}
            </Badge>
          )}
          <RelativeTime
            dateTime={approval.decided_at ?? approval.created_at}
            className="text-[11px]"
          />
        </div>
        <ApprovalSummary approval={approval} />
        {approval.execution_status === "failed" && approval.execution_error && (
          <p className="text-xs text-destructive">{approval.execution_error}</p>
        )}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      )}
    </div>
  );
}
