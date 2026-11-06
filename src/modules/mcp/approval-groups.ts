import type { ToolApproval } from "./schemas";

/**
 * Pure helpers for the approvals panel: split pending vs. decided, group by
 * service, and build short human summaries of tool arguments / outputs.
 * Every value read from `proposed_input` / `execution_output` is `unknown`,
 * so all accessors are defensive.
 */

export const APPROVAL_CATEGORIES = [
  "mail",
  "calendar",
  "drive",
  "sheets",
  "docs",
  "other",
] as const;
export type ApprovalCategory = (typeof APPROVAL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ApprovalCategory, string> = {
  mail: "Mail",
  calendar: "Calendar",
  drive: "Drive",
  sheets: "Sheets",
  docs: "Docs",
  other: "Other",
};

export interface ApprovalGroup {
  category: ApprovalCategory;
  label: string;
  items: ToolApproval[];
}

export function normalizeCategory(value: unknown): ApprovalCategory {
  return typeof value === "string" && (APPROVAL_CATEGORIES as readonly string[]).includes(value)
    ? (value as ApprovalCategory)
    : "other";
}

/** Sort key: decision time when decided, otherwise creation time. */
export function approvalTimestamp(approval: ToolApproval): number {
  const t = new Date(approval.decided_at ?? approval.created_at).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function approvalLabel(approval: ToolApproval): string {
  return approval.label?.trim() || approval.tool_name;
}

/** Splits into pending (awaiting a decision) and history (everything else). */
export function splitApprovals(approvals: readonly ToolApproval[]): {
  pending: ToolApproval[];
  history: ToolApproval[];
} {
  const pending: ToolApproval[] = [];
  const history: ToolApproval[] = [];
  for (const a of approvals) (a.status === "pending" ? pending : history).push(a);
  return { pending, history };
}

/** Groups by service in fixed order, newest first within a group, empty groups omitted. */
export function groupApprovals(approvals: readonly ToolApproval[]): ApprovalGroup[] {
  const buckets = new Map<ApprovalCategory, ToolApproval[]>();
  for (const a of approvals) {
    const key = normalizeCategory(a.category);
    const list = buckets.get(key);
    if (list) list.push(a);
    else buckets.set(key, [a]);
  }
  return APPROVAL_CATEGORIES.flatMap((category) => {
    const items = buckets.get(category);
    if (!items || items.length === 0) return [];
    return [
      {
        category,
        label: CATEGORY_LABELS[category],
        items: [...items].sort((x, y) => approvalTimestamp(y) - approvalTimestamp(x)),
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(asText).filter((v): v is string => Boolean(v));
    return parts.length ? parts.join(", ") : null;
  }
  return null;
}

/** Calendar start/end may be a string or `{ dateTime }` / `{ date }`. */
function asWhen(value: unknown): string | null {
  if (isRecord(value)) return asText(value.dateTime) ?? asText(value.date);
  return asText(value);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function joinParts(parts: Array<[string, string | null]>): string | null {
  const shown = parts.filter((p): p is [string, string] => Boolean(p[1]));
  return shown.length ? shown.map(([k, v]) => `${k}: ${v}`).join(" · ") : null;
}

const PREVIEW_MAX = 140;

/** Compact, readable one-line summary of the tool arguments, or null when empty. */
export function summarizeInput(
  category: unknown,
  input: Record<string, unknown> | null | undefined,
): string | null {
  if (!isRecord(input) || Object.keys(input).length === 0) return null;

  let summary: string | null = null;
  switch (normalizeCategory(category)) {
    case "mail":
      summary = joinParts([
        ["To", asText(input.to)],
        ["Subject", asText(input.subject)],
      ]);
      break;
    case "calendar": {
      const event = isRecord(input.event) ? input.event : input;
      summary = joinParts([
        ["Event", asText(event.summary)],
        ["Start", asWhen(event.start)],
      ]);
      break;
    }
    case "drive":
      summary = joinParts([["Name", asText(input.name)]]);
      break;
    case "sheets":
      summary = joinParts([
        ["Sheet", asText(input.spreadsheet_id)],
        ["Range", asText(input.range)],
      ]);
      break;
    case "docs":
      summary = joinParts([
        ["Title", asText(input.title)],
        ["Doc", asText(input.document_id)],
      ]);
      break;
    default:
      break;
  }
  if (summary) return truncate(summary, PREVIEW_MAX);

  let json: string;
  try {
    json = JSON.stringify(input) ?? "";
  } catch {
    return null;
  }
  return json ? truncate(json, PREVIEW_MAX) : null;
}

/** The "Open" link from a handler result (Drive webViewLink / Calendar htmlLink), http(s) only. */
export function executionLink(output: Record<string, unknown> | null | undefined): string | null {
  if (!isRecord(output)) return null;
  for (const key of ["webViewLink", "htmlLink"]) {
    const value = output[key];
    if (typeof value !== "string") continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {
      // not a URL — ignore
    }
  }
  return null;
}
