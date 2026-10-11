/**
 * A tiny Markdown PARSER for model output (.agent/phase_4.txt item 36).
 *
 * Model output is UNTRUSTED input, so the parser is deliberately conservative
 * and the renderer it feeds never touches `dangerouslySetInnerHTML`. This file
 * is pure string logic — no React — so it can be unit tested directly.
 *
 * Scope: fenced code, headings, GFM tables, LaTeX math blocks, lists,
 * blockquotes, horizontal rules, paragraphs, and (via `parseInline`) bold /
 * italic / inline code / inline math / links. An unrecognised line degrades to
 * plain text, which is a safe default.
 */

export type Block =
  | { kind: "code"; language: string | null; code: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "table"; header: string[]; align: ("left" | "center" | "right")[]; rows: string[][] }
  | { kind: "math"; latex: string }
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

    // Display math: $$ ... $$ (single line or multi-line).
    if (/^\s*\$\$\s*$/.test(line)) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*\$\$\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; // consume closing $$
      const latex = body.join("\n").trim();
      if (latex) blocks.push({ kind: "math", latex });
      continue;
    }
    const inlineMathBlock = /^\s*\$\$(.+?)\$\$\s*$/.exec(line);
    if (inlineMathBlock) {
      blocks.push({ kind: "math", latex: inlineMathBlock[1].trim() });
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

    // GFM table: header row, delimiter row, then 0+ body rows.
    if (line.includes("|") && isDelimiterRow(lines[index + 1])) {
      const header = splitTableRow(line);
      const aligns = splitTableRow(lines[index + 1]).map(parseAlign);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        rows.push(normaliseRow(splitTableRow(lines[index]), header.length));
        index += 1;
      }
      blocks.push({
        kind: "table",
        header,
        align: normaliseRow(aligns, header.length, "left" as const),
        rows,
      });
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
      if (/^\s*\$\$/.test(current)) break;
      if (current.includes("|") && isDelimiterRow(lines[index + 1])) break;
      paragraph.push(current);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
}

/** Split a `| a | b |` row into cells (trims outer pipes + whitespace). */
function splitTableRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  // Split on unescaped pipes only.
  const cells: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of text) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isDelimiterRow(line: string | undefined): boolean {
  if (!line || !line.includes("|")) return false;
  const cells = splitTableRow(line);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-+:?$/.test(cell));
}

function parseAlign(cell: string): "left" | "center" | "right" {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

function normaliseRow<T>(cells: T[], width: number, fill?: T): T[] {
  const out = cells.slice(0, width);
  while (out.length < width) out.push((fill ?? cells[cells.length - 1] ?? ("" as unknown as T)) as T);
  return out;
}

/**
 * Heuristic: does this fenced block look like CSV/TSV data? LLMs often return
 * bare CSV inside ```csv fences (or without fences); the renderer offers those
 * blocks a table preview + download without needing a markdown table.
 */
export function looksLikeCsv(code: string): boolean {
  const lines = code
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  const delim = detectDelimiter(lines.slice(0, 5));
  if (!delim) return false;
  const widths = lines.slice(0, 5).map((l) => parseDelimitedLine(l, delim).length);
  return widths.every((w) => w > 1 && w === widths[0]);
}

export function detectDelimiter(sample: string[]): "," | "\t" | ";" | "|" | null {
  const candidates: ("," | "\t" | ";" | "|")[] = [",", "\t", ";", "|"];
  for (const delim of candidates) {
    const counts = sample.map((line) => parseDelimitedLine(line, delim).length);
    if (counts.every((c) => c > 1 && c === counts[0])) return delim;
  }
  return null;
}

/** Minimal quoted-field aware split for , ; | tab. */
export function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells.map((c) => c.replace(/^"|"$/g, ""));
}

/** Parse a whole CSV/TSV body into header + rows for tabular preview. */
export function parseDelimitedTable(code: string): { header: string[]; rows: string[][] } | null {
  const lines = code
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const delim = detectDelimiter(lines.slice(0, Math.min(5, lines.length)));
  if (!delim) return null;
  const header = parseDelimitedLine(lines[0], delim);
  const rows = lines.slice(1).map((l) => normaliseRow(parseDelimitedLine(l, delim), header.length, ""));
  if (header.length < 2) return null;
  return { header, rows };
}

/** An inline token. `text` is always plain text — never markup. */
export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "math"; latex: string }
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

    // Inline math: $...$ and \(...\) — single $ needs a closing pair and must
    // not be a lone currency symbol ("cost is $5").
    if (rest.startsWith("$$")) {
      const end = rest.indexOf("$$", 2);
      if (end > 2) {
        flush();
        tokens.push({ kind: "math", latex: rest.slice(2, end).trim() });
        index += end + 2;
        continue;
      }
    }
    if (rest.startsWith("\\(")) {
      const end = rest.indexOf("\\)", 2);
      if (end > 2) {
        flush();
        tokens.push({ kind: "math", latex: rest.slice(2, end).trim() });
        index += end + 2;
        continue;
      }
    }
    if (rest.startsWith("$")) {
      const end = rest.indexOf("$", 1);
      // Require non-empty content and no surrounding whitespace-only issues;
      // a space right after opening $ means currency, not math.
      if (end > 1 && rest[1] !== " " && rest[end - 1] !== " ") {
        flush();
        tokens.push({ kind: "math", latex: rest.slice(1, end).trim() });
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
