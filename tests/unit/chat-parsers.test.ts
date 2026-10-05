// NOTE: no `import ... from "vitest"` here — on purpose. With this vitest build
// the imported `describe` is not bound to the worker's suite collector and every
// suite fails at its first `describe` call. `globals: true` in vitest.config.ts
// injects describe/it/expect instead; see the note there.
import { parseFrame } from "@/shared/lib/sse";
import { parseBlocks, parseInline, safeHref } from "@/modules/chat/markdown";

/**
 * Unit coverage for the two pure parsers phase 4 adds: the SSE frame reader
 * (.agent/phase_4.txt item 34) and the Markdown tokenizer (item 36).
 *
 * Both are security-relevant — one parses untrusted bytes off the wire, the
 * other parses untrusted model output — so their edge cases are pinned here
 * rather than only exercised through the UI.
 */

describe("parseFrame (SSE)", () => {
  it("parses a named event with a JSON payload", () => {
    const frame = parseFrame('event: response\ndata: {"id":"abc"}');
    expect(frame).toMatchObject({ event: "response", data: '{"id":"abc"}', comment: false });
  });

  it("joins multi-line data with a newline, per the spec", () => {
    const frame = parseFrame("event: done\ndata: line1\ndata: line2");
    expect(frame?.data).toBe("line1\nline2");
  });

  it("treats a leading colon as a comment (the keep-alive)", () => {
    expect(parseFrame(": keep-alive")).toMatchObject({ comment: true });
  });

  it("strips exactly one space after the colon", () => {
    expect(parseFrame("event: done\ndata:  padded")?.data).toBe(" padded");
  });

  it("tolerates CRLF line endings", () => {
    expect(parseFrame("event: done\r\ndata: {}\r\n")).toMatchObject({ event: "done", data: "{}" });
  });

  it("returns null for an empty frame", () => {
    expect(parseFrame("")).toBeNull();
    expect(parseFrame("   ")).toBeNull();
  });

  it("ignores unknown fields but still counts the frame as present", () => {
    expect(parseFrame("weird: 1\ndata: x")).toMatchObject({ data: "x" });
  });
});

describe("safeHref", () => {
  it("allows http, https and mailto", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("mailto:a@example.com")).toBe("mailto:a@example.com");
  });

  it("allows same-origin fragments and paths", () => {
    expect(safeHref("#section")).toBe("#section");
    expect(safeHref("/projects")).toBe("/projects");
  });

  // Model output is untrusted: a javascript: URL must never become an href.
  it("rejects javascript: and data: URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>")).toBeNull();
  });
});

describe("parseBlocks (Markdown)", () => {
  it("parses a fenced code block with its language", () => {
    expect(parseBlocks("```python\nprint(1)\n```")).toEqual([
      { kind: "code", language: "python", code: "print(1)" },
    ]);
  });

  it("parses headings, lists and quotes", () => {
    const blocks = parseBlocks("# Title\n\n- one\n- two\n\n> quoted");
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "list", "quote"]);
  });

  it("does not start a list on a bullet that follows paragraph text", () => {
    expect(parseBlocks("Some text\n- not a list")[0]).toMatchObject({
      kind: "paragraph",
      text: "Some text",
    });
  });

  it("returns no blocks for empty input", () => {
    expect(parseBlocks("")).toEqual([]);
  });
});

describe("parseInline (Markdown)", () => {
  it("parses bold, italic and inline code", () => {
    const tokens = parseInline("**bold** and *soft* and `code`");
    expect(tokens.map((token) => token.kind)).toEqual(["strong", "text", "em", "text", "code"]);
  });

  it("keeps a safe link as a link", () => {
    expect(parseInline("[docs](https://example.com)")[0]).toMatchObject({
      kind: "link",
      href: "https://example.com",
    });
  });

  // A javascript: href degrades to inert text instead of becoming an anchor.
  it("degrades an unsafe link to plain text", () => {
    expect(parseInline("[click](javascript:alert(1))")[0]).toMatchObject({
      kind: "text",
      text: "click",
    });
  });

  it("does not treat a lone asterisk as emphasis", () => {
    expect(parseInline("2 * 3").every((token) => token.kind === "text")).toBe(true);
  });
});
