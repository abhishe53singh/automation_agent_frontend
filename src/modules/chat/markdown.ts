/**
 * A tiny Markdown PARSER for model output (.agent/phase_4.txt item 36).
 *
 * Model output is UNTRUSTED input, so the parser is deliberately conservative
 * and the renderer it feeds never touches `dangerouslySetInnerHTML`. This file
 * is pure string logic — no React — so it can be unit tested directly.
 *
 * Scope: fenced code, headings, lists, blockquotes, horizontal rules,
 * paragraphs, and (via `parseInline`) bold / italic / inline code / links. An
 * unrecognised line degrades to plain text, which is a safe default.
 */

export type Block =
  | { kind: "code"; language: string | null; code: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "rule" };

/** Split markdown source into block-level tokens. */
export function parseBlocks(source: string): Block[] {
  const lines = (source ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    // Fenced code block: ``` or ~~~ with an optional language tag.
    const fence = /^\s*(`{3,}|~{3,})\s*([A-Za-z0-9+#._-]*)\s*$/.exec(line);
    if (fence) {
      const marker = fence[1];
      const language = fence[2] ? fence[2].toLowerCase() : null;
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith(marker)) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; // consume the closing fence (or fall off the end)
      blocks.push({ kind: "code", language, code: body.join("\n") });
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      const body: string[] = [quote[1]];
      index += 1;
      while (index < lines.length) {
        const next = /^\s*>\s?(.*)$/.exec(lines[index]);
        if (!next) break;
        body.push(next[1]);
        index += 1;
      }
      blocks.push({ kind: "quote", text: body.join("\n") });
      continue;
    }

    const bullet = /^\s*([-*+])\s+(.*)$/.exec(line);
    const ordered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const item = isOrdered
          ? /^\s*(\d+)[.)]\s+(.*)$/.exec(lines[index])
          : /^\s*([-*+])\s+(.*)$/.exec(lines[index]);
        if (!item) break;
        items.push(item[2]);
        index += 1;
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const current = lines[index];
      if (/^\s*(`{3,}|~{3,})/.test(current)) break;
      if (/^#{1,6}\s/.test(current)) break;
      if (/^\s*([-*+])\s+/.test(current) || /^\s*\d+[.)]\s+/.test(current)) break;
      if (/^\s*>\s?/.test(current)) break;
      paragraph.push(current);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
}

/** An inline token. `text` is always plain text — never markup. */
export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; href: string };

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * Only absolute http(s)/mailto links and same-origin fragments/paths survive.
 * Anything else (`javascript:`, `data:`, …) returns null and the renderer draws
 * the label as inert text.
 */
export function safeHref(href: string): string | null {
  const trimmed = (href ?? "").trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  try {
    const url = new URL(trimmed);
    return SAFE_PROTOCOLS.includes(url.protocol) ? trimmed : null;
  } catch {
    return null;
  }
}

/** Tokenise inline markup. Code spans win, so `**` inside them stays literal. */
export function parseInline(source: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const text = source ?? "";
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (buffer) {
      tokens.push({ kind: "text", text: buffer });
      buffer = "";
    }
  };

  while (index < text.length) {
    const rest = text.slice(index);

    // Inline code — highest precedence.
    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) {
        flush();
        tokens.push({ kind: "code", text: rest.slice(1, end) });
        index += end + 1;
        continue;
      }
    }

    // Link: [label](href)
    if (rest.startsWith("[")) {
      const closeLabel = rest.indexOf("]");
      if (closeLabel > 0 && rest[closeLabel + 1] === "(") {
        const closeHref = rest.indexOf(")", closeLabel + 2);
        if (closeHref > 0) {
          flush();
          const label = rest.slice(1, closeLabel);
          const href = safeHref(rest.slice(closeLabel + 2, closeHref));
          tokens.push(href ? { kind: "link", text: label, href } : { kind: "text", text: label });
          index += closeHref + 1;
          continue;
        }
      }
    }

    if (rest.startsWith("**") || rest.startsWith("__")) {
      const marker = rest.slice(0, 2);
      const end = rest.indexOf(marker, 2);
      if (end > 0) {
        flush();
        tokens.push({ kind: "strong", text: rest.slice(2, end) });
        index += end + 2;
        continue;
      }
    }

    if (rest.startsWith("*") || rest.startsWith("_")) {
      const marker = rest[0];
      const end = rest.indexOf(marker, 1);
      // A single-character span is not emphasis (`a * b`).
      if (end > 1) {
        flush();
        tokens.push({ kind: "em", text: rest.slice(1, end) });
        index += end + 1;
        continue;
      }
    }

    buffer += text[index];
    index += 1;
  }

  flush();
  return tokens;
}
