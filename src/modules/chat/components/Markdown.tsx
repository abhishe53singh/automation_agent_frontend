"use client";

import * as React from "react";

import { parseBlocks, parseDelimitedTable, parseInline, type Block } from "../markdown";
import { MathView } from "./MathView";
import { BlockToolbar, RichTable, downloadTextFile, toCsv, useCopyText } from "./rich-blocks";

/**
 * Renders model output as Markdown (item 36).
 *
 * SAFETY: nothing here uses `dangerouslySetInnerHTML` — every node is built
 * from the tokens in `../markdown`, so injected markup in a model response
 * cannot execute. Link hrefs are pre-filtered by `safeHref`.
 *
 * PERF (item 36, long threads): the block list and every inline token list are
 * memoized and the highlighter is pure, so re-rendering one response card does
 * not re-tokenize the others.
 */

export interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  const blocks = React.useMemo(() => parseBlocks(content ?? ""), [content]);

  return (
    <div className={className ? `space-y-3 ${className}` : "space-y-3"}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "code":
      return <CodeBlock language={block.language} code={block.code} />;
    case "table":
      return (
        <RichTable
          header={block.header}
          rows={block.rows}
          align={block.align}
          caption={`Table · ${block.rows.length} row${block.rows.length === 1 ? "" : "s"}`}
        />
      );
    case "math":
      return <MathView latex={block.latex} display />;
    case "heading": {
      const Tag = `h${Math.min(block.level + 2, 6)}` as "h3" | "h4" | "h5" | "h6";
      return (
        <Tag className="text-sm font-semibold text-foreground">
          <Inline text={block.text} />
        </Tag>
      );
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={block.ordered ? "list-decimal space-y-1 pl-5 text-sm text-foreground marker:text-muted-foreground" : "list-disc space-y-1 pl-5 text-sm text-foreground marker:text-muted-foreground"}>
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
          <Inline text={block.text} />
        </blockquote>
      );
    case "rule":
      return <hr className="border-border" />;
    case "paragraph":
    default:
      return (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          <Inline text={block.text} />
        </p>
      );
  }
}

function Inline({ text }: { text: string }) {
  const tokens = React.useMemo(() => parseInline(text), [text]);

  return (
    <>
      {tokens.map((token, index) => {
        switch (token.kind) {
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
              >
                {token.text}
              </code>
            );
          case "strong":
            return (
              <strong key={index} className="font-semibold">
                {token.text}
              </strong>
            );
          case "em":
            return (
              <em key={index} className="italic">
                {token.text}
              </em>
            );
          case "math":
            return <MathView key={index} latex={token.latex} />;
          case "link":
            return (
              <a
                key={index}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {token.text}
              </a>
            );
          case "text":
          default:
            return <React.Fragment key={index}>{token.text}</React.Fragment>;
        }
      })}
    </>
  );
}

function CodeBlock({ language, code }: { language: string | null; code: string }) {
  const lang = (language ?? "").toLowerCase();
  const isCsvHint = ["csv", "tsv", "psv", "ssv", "dsv"].includes(lang);
  const table = React.useMemo(
    () => (isCsvHint || lang === "text" || lang === "" ? parseDelimitedTable(code) : null),
    [code, isCsvHint, lang],
  );
  const [view, setView] = React.useState<"preview" | "raw">("preview");

  // CSV-ish fenced block: tabular preview + copy/download as .csv.
  if (table) {
    const csv = toCsv(table.header, table.rows);
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-md border border-border bg-muted/40">
          <BlockToolbar
            title={`${lang === "" ? "csv" : lang} · ${table.rows.length} rows`}
            copyText={code}
            download={{ filename: "data.csv", content: code.endsWith("\n") ? code : `${code}\n`, mime: "text/csv;charset=utf-8", label: "CSV" }}
            extra={
              <button
                type="button"
                onClick={() => setView((v) => (v === "preview" ? "raw" : "preview"))}
                className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {view === "preview" ? "Raw" : "Table"}
              </button>
            }
          />
          {view === "raw" ? (
            <pre className="overflow-x-auto p-3">
              <code className="font-mono text-xs">{code}</code>
            </pre>
          ) : null}
        </div>
        {view === "preview" ? (
          <RichTable header={table.header} rows={table.rows} caption={`CSV preview · ${table.rows.length} rows`} copyText={csv} download={{ filename: "data.csv", content: `${csv}\n`, mime: "text/csv;charset=utf-8", label: "CSV" }} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/40">
      <BlockToolbar
        title={language ?? "code"}
        copyText={code}
        download={{ filename: `snippet.${lang || "txt"}`, content: code, label: "File" }}
      />
      <pre className="overflow-x-auto p-3">
        <code className="font-mono text-xs">{highlightCode(code, language)}</code>
      </pre>
    </div>
  );
}

/**
 * Lightweight token highlighting (item 36).
 *
 * A regex highlighter, not a per-grammar parser: it recognises comments,
 * strings, numbers and common keywords across languages. That meets the
 * readability goal (scannable code) without shipping a multi-megabyte
 * highlighter — and, like the rest of the file, it emits React nodes rather
 * than HTML, so it cannot inject anything.
 */
export function highlightCode(code: string, language: string | null): React.ReactNode {
  const KEYWORDS = [
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "class",
    "import",
    "export",
    "from",
    "async",
    "await",
    "try",
    "catch",
    "finally",
    "new",
    "this",
    "null",
    "undefined",
    "true",
    "false",
    "def",
    "elif",
    "lambda",
    "None",
    "True",
    "False",
    "print",
    "func",
    "package",
    "type",
    "interface",
    "struct",
  ];

  // Comment syntax depends on the language family.
  const hashComment = ["python", "py", "bash", "sh", "yaml", "yml"].includes(language ?? "");
  const commentStart = hashComment ? "#" : "//";

  const pattern = new RegExp(
    [
      `(${escapeRegExp(commentStart)}[^\\n]*)`, // 1 comment
      "(\"[^\"\\n]*\"|'[^'\\n]*'|`[^`\\n]*`)", // 2 string
      "\\b(\\d+(?:\\.\\d+)?)\\b", // 3 number
      `\\b(${KEYWORDS.join("|")})\\b`, // 4 keyword
    ].join("|"),
    "g",
  );

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > lastIndex) nodes.push(code.slice(lastIndex, match.index));
    const [full, comment, str, num] = match;
    const className = comment
      ? "text-muted-foreground italic"
      : str
        ? "text-success"
        : num
          ? "text-warning"
          : "text-info";
    nodes.push(
      <span key={`${match.index}-${full}`} className={className}>
        {full}
      </span>,
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < code.length) nodes.push(code.slice(lastIndex));
  return nodes;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Copy-to-clipboard control used by code blocks and response cards. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { copied, copy } = useCopyText(text);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export { downloadTextFile };
