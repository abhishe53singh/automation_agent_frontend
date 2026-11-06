// NOTE: no `import ... from "vitest"` — globals are injected (see vitest.config.ts).
import {
  approvalLabel,
  executionLink,
  groupApprovals,
  normalizeCategory,
  splitApprovals,
  summarizeInput,
} from "@/modules/mcp/approval-groups";
import type { ToolApproval } from "@/modules/mcp/schemas";

let seq = 0;
function approval(overrides: Partial<ToolApproval> = {}): ToolApproval {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    user_id: "00000000-0000-4000-8000-000000000000",
    tool_name: "some_tool",
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    category: "other",
    approvable_in_chat: false,
    ...overrides,
  };
}

describe("splitApprovals", () => {
  it("separates pending from decided", () => {
    const { pending, history } = splitApprovals([
      approval({ status: "pending" }),
      approval({ status: "approved" }),
      approval({ status: "rejected" }),
      approval({ status: "expired" }),
    ]);
    expect(pending).toHaveLength(1);
    expect(history.map((a) => a.status)).toEqual(["approved", "rejected", "expired"]);
  });
});

describe("groupApprovals", () => {
  it("orders groups Mail→Other, hides empty ones, and maps unknown categories to Other", () => {
    const groups = groupApprovals([
      approval({ category: "other" }),
      approval({ category: "drive" }),
      approval({ category: "mail" }),
      approval({ category: "bogus" }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Mail", "Drive", "Other"]);
    expect(groups[2]?.items).toHaveLength(2);
  });

  it("sorts newest first by decided_at, falling back to created_at", () => {
    const a = approval({ category: "mail", created_at: "2026-01-01T00:00:00Z" });
    const b = approval({
      category: "mail",
      created_at: "2025-12-01T00:00:00Z",
      decided_at: "2026-02-01T00:00:00Z",
    });
    const c = approval({ category: "mail", created_at: "2026-01-15T00:00:00Z" });
    expect(groupApprovals([a, b, c])[0]?.items.map((x) => x.id)).toEqual([b.id, c.id, a.id]);
  });

  it("returns [] for no approvals", () => {
    expect(groupApprovals([])).toEqual([]);
  });
});

describe("normalizeCategory / approvalLabel", () => {
  it("normalizes", () => {
    expect(normalizeCategory("sheets")).toBe("sheets");
    expect(normalizeCategory(undefined)).toBe("other");
  });
  it("falls back to tool_name when label is missing or blank", () => {
    expect(approvalLabel(approval({ label: "Send email" }))).toBe("Send email");
    expect(approvalLabel(approval({ label: "  ", tool_name: "gmail_send" }))).toBe("gmail_send");
  });
});

describe("summarizeInput", () => {
  it("summarizes mail", () => {
    expect(summarizeInput("mail", { to: ["a@x.com", "b@x.com"], subject: "Hi", body: "…" })).toBe(
      "To: a@x.com, b@x.com · Subject: Hi",
    );
  });
  it("summarizes calendar with nested event and dateTime start", () => {
    expect(
      summarizeInput("calendar", {
        event: { summary: "Standup", start: { dateTime: "2026-01-02T09:00:00Z" } },
      }),
    ).toBe("Event: Standup · Start: 2026-01-02T09:00:00Z");
  });
  it("summarizes drive and sheets", () => {
    expect(summarizeInput("drive", { name: "report.pdf" })).toBe("Name: report.pdf");
    expect(summarizeInput("sheets", { spreadsheet_id: "abc", range: "A1:B2" })).toBe(
      "Sheet: abc · Range: A1:B2",
    );
  });
  it("falls back to a truncated JSON preview", () => {
    expect(summarizeInput("other", { q: 1 })).toBe('{"q":1}');
    expect(summarizeInput("mail", { cc: "x" })).toBe('{"cc":"x"}');
    const long = summarizeInput("other", { text: "x".repeat(500) });
    expect(long?.length).toBe(140);
    expect(long?.endsWith("…")).toBe(true);
  });
  it("returns null for empty / missing input", () => {
    expect(summarizeInput("mail", null)).toBeNull();
    expect(summarizeInput("mail", {})).toBeNull();
  });
});

describe("executionLink", () => {
  it("returns http(s) webViewLink or htmlLink", () => {
    expect(executionLink({ webViewLink: "https://drive.google.com/file/d/1" })).toBe(
      "https://drive.google.com/file/d/1",
    );
    expect(executionLink({ htmlLink: "https://calendar.google.com/e?x=1" })).toBe(
      "https://calendar.google.com/e?x=1",
    );
  });
  it("rejects non-http schemes, non-strings and garbage", () => {
    expect(executionLink({ webViewLink: "javascript:alert(1)" })).toBeNull();
    expect(executionLink({ htmlLink: 42 })).toBeNull();
    expect(executionLink({ webViewLink: "not a url" })).toBeNull();
    expect(executionLink(null)).toBeNull();
  });
});
