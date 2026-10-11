import type { IngestionJobStatus } from "../schemas";

/** Status badge tone for file + job states (semantic tokens only). */
export function jobStatusVariant(status: string):
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info" {
  switch (status as IngestionJobStatus | string) {
    case "succeeded":
    case "embedded":
    case "ready":
      return "success";
    case "running":
    case "chunked":
    case "parsed":
      return "info";
    case "pending":
      return "warning";
    case "failed":
      return "destructive";
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}

/** Plain-words status label (no jargon). */
export function jobStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Waiting";
    case "running":
      return "Working";
    case "succeeded":
      return "Ready";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  }
}
