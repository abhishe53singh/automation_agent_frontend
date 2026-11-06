"use client";

import "katex/dist/katex.min.css";

import type { Element, ElementContent, Root, RootContent } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { common, createLowlight } from "lowlight";
import * as React from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { normalizeMath, parseDelimitedTable, safeHref } from "../markdown";
import { CodePreview, fileInfo, previewKind } from "./CodePreview";
import { QuizPreview, parseQuiz } from "./QuizView";
import { BlockToolbar, RichTable, downloadTextFile, toCsv, useCopyText } from "./rich-blocks";

/**
 * Rich renderer for chat content (model answers and user messages).
 *
 * - GitHub-flavoured Markdown (tables, task lists, strikethrough, autolinks)
 * - LaTeX via KaTeX: `$…$`, `$$…$$`, `\(…\)`, `\[…\]` and bare
 *   `\begin{…}…\end{…}` blocks (aligned, bmatrix, cases, \boxed, \left…\right …)
 * - Syntax highlighting via lowlight (highlight.js grammars)
 * - CSV-ish code blocks become a table preview with copy / CSV download
 *
 * SAFETY: raw HTML in the source is never rendered (no rehype-raw); links go
 * through `safeHref`; KaTeX runs with `trust: false`; highlighted code is
 * built as React elements from the lowlight tree, not injected as HTML.
 */

const lowlight = createLowlight(common);

/** Auto-detecting a language is O(languages); skip it for huge blocks. */
const AUTO_DETECT_MAX = 20_000;

export interface MarkdownProps {
  content: string;
  className?: string;
  /** "inverse" = rendered on a primary-colored bubble (the user's message). */
  tone?: "default" | "inverse";
}

const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkBreaks];
const REHYPE_PLUGINS: React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"] = [
  [rehypeKatex, { throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml" }],
];

export const Markdown = React.memo(function Markdown({
  content,
  className,
  tone = "default",
}: MarkdownProps) {
  const source = React.useMemo(() => normalizeMath(content ?? ""), [content]);
  const components = tone === "inverse" ? INVERSE_COMPONENTS : DEFAULT_COMPONENTS;

  return (
    <div
      className={[
        "rich-content min-w-0 space-y-3 break-words text-sm leading-relaxed",
        tone === "default" ? "text-foreground" : "",
        className ?? "",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
        urlTransform={(url) => safeHref(url) ?? ""}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Element mapping
// ---------------------------------------------------------------------------

function buildComponents(tone: "default" | "inverse"): Components {
  const inverse = tone === "inverse";
  const muted = inverse ? "opacity-80" : "text-muted-foreground";

  return {
    p: ({ children }) => <p className="my-0">{children}</p>,
    h1: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
    h2: ({ children }) => <h4 className="text-[15px] font-semibold">{children}</h4>,
    h3: ({ children }) => <h5 className="text-sm font-semibold">{children}</h5>,
    h4: ({ children }) => <h6 className="text-sm font-semibold">{children}</h6>,
    h5: ({ children }) => <h6 className="text-sm font-medium">{children}</h6>,
    h6: ({ children }) => <h6 className={`text-sm font-medium ${muted}`}>{children}</h6>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className={muted}>{children}</del>,
    ul: ({ children, className }) => (
      <ul
        className={
          className?.includes("contains-task-list")
            ? "space-y-1 pl-1"
            : `list-disc space-y-1 pl-5 ${inverse ? "" : "marker:text-muted-foreground"}`
        }
      >
        {children}
      </ul>
    ),
    ol: ({ children, start }) => (
      <ol
        start={start}
        className={`list-decimal space-y-1 pl-5 ${inverse ? "" : "marker:text-muted-foreground"}`}
      >
        {children}
      </ol>
    ),
    li: ({ children, className }) => (
      <li className={className?.includes("task-list-item") ? "flex items-start gap-2" : ""}>
        {children}
      </li>
    ),
    input: ({ checked, type }) =>
      type === "checkbox" ? (
        <input type="checkbox" checked={Boolean(checked)} disabled readOnly className="mt-1" />
      ) : null,
    blockquote: ({ children }) => (
      <blockquote
        className={`border-l-2 pl-3 italic ${inverse ? "border-current/40" : "border-border text-muted-foreground"}`}
      >
        {children}
      </blockquote>
    ),
    hr: () => <hr className={inverse ? "border-current/30" : "border-border"} />,
    a: ({ href, children }) =>
      href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 ${inverse ? "" : "text-primary"}`}
        >
          {children}
        </a>
      ) : (
        <>{children}</>
      ),
    code: ({ children, className }) => (
      // Block code is handled by `pre` below; this is inline `code`.
      <code
        className={`rounded px-1 py-0.5 font-mono text-[0.85em] ${
          inverse ? "bg-primary-foreground/15" : "bg-muted"
        } ${className ?? ""}`}
      >
        {children}
      </code>
    ),
    pre: ({ node }) => {
      const code = node?.children.find(
        (child): child is Element => child.type === "element" && child.tagName === "code",
      );
      if (!code) return null;
      return <CodeBlock language={languageOf(code)} code={textOf(code).replace(/\n$/, "")} />;
    },
    table: ({ node, children }) => <MarkdownTable node={node}>{children}</MarkdownTable>,
    thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
    th: ({ children, style }) => (
      <th
        style={style}
        className="whitespace-nowrap border-b border-border px-3 py-2 text-left font-semibold"
      >
        {children}
      </th>
    ),
    td: ({ children, style }) => (
      <td style={style} className="border-b border-border px-3 py-2 align-top">
        {children}
      </td>
    ),
    // KaTeX emits many spans; only its error span is replaced, the rest pass
    // through with every attribute (aria-hidden, style, …) intact.
    span: (props) => {
      // `node` is react-markdown's hast node, not a DOM attribute.
      const { node, ...rest } = props;
      void node;
      return rest.className?.split(" ").includes("katex-error") ? (
        <MathError source={textFromChildren(rest.children)} reason={rest.title} />
      ) : (
        <span {...rest} />
      );
    },
    img: ({ src, alt }) =>
      typeof src === "string" && safeHref(src) ? (
        // Model-supplied remote images; no Next optimisation for arbitrary hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="max-h-96 max-w-full rounded-md" />
      ) : null,
  };
}

const DEFAULT_COMPONENTS = buildComponents("default");
const INVERSE_COMPONENTS = buildComponents("inverse");

// ---------------------------------------------------------------------------
// hast helpers
// ---------------------------------------------------------------------------

function textOf(node: Root | RootContent | ElementContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map((child) => textOf(child)).join("");
  return "";
}

function languageOf(code: Element): string | null {
  const classes = code.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [];
  const match = list.find((name) => name.startsWith("language-"));
  return match ? match.slice("language-".length) : null;
}

function childElements(node: Element | undefined, tagName: string): Element[] {
  return (node?.children ?? []).filter(
    (child): child is Element => child.type === "element" && child.tagName === tagName,
  );
}

/** Plain-text header + rows of a GFM table, for copy / CSV download. */
function tableText(node: Element | undefined): { header: string[]; rows: string[][] } {
  const rowsOf = (section: Element | undefined) =>
    childElements(section, "tr").map((tr) =>
      (tr.children.filter((c) => c.type === "element") as Element[]).map((cell) =>
        textOf(cell).trim(),
      ),
    );
  const [head] = childElements(node, "thead");
  const [body] = childElements(node, "tbody");
  return { header: rowsOf(head)[0] ?? [], rows: rowsOf(body) };
}

function textFromChildren(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join("");
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * LaTeX KaTeX could not parse (typically unbalanced braces). Shows why, plus
 * the source in a readable, copyable block, instead of KaTeX's red text.
 */
function MathError({ source, reason }: { source: string; reason?: string }) {
  const { copied, copy } = useCopyText(source);
  const message = (reason ?? "")
    .replace(/^ParseError:\s*/, "")
    .replace(/^KaTeX parse error:\s*/, "");
  const block = source.includes("\n") || source.length > 120;

  if (!block) {
    return (
      <code
        title={message ? `Formula error: ${message}` : "Formula error"}
        className="rounded bg-warning/15 px-1 py-0.5 font-mono text-[0.85em] text-foreground underline decoration-warning decoration-wavy underline-offset-2"
      >
        {source}
      </code>
    );
  }

  return (
    <span
      role="note"
      className="my-1 block overflow-hidden rounded-md border border-warning/50 bg-card text-card-foreground"
    >
      <span className="flex items-center justify-between gap-2 border-b border-border bg-warning/10 px-3 py-1.5 text-xs">
        <span>
          <span className="font-medium">Formula couldn&apos;t be rendered</span>
          {message ? <span className="text-muted-foreground"> — {message}</span> : null}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {copied ? "Copied" : "Copy LaTeX"}
        </button>
      </span>
      <code className="block max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs">
        {source}
      </code>
    </span>
  );
}

/** GFM table: cells keep their formatting (bold, code, math); toolbar copies CSV. */
function MarkdownTable({ node, children }: { node?: Element; children: React.ReactNode }) {
  const { header, rows } = React.useMemo(() => tableText(node), [node]);
  const csv = React.useMemo(() => toCsv(header, rows), [header, rows]);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card text-card-foreground">
      <BlockToolbar
        title={`Table · ${rows.length} row${rows.length === 1 ? "" : "s"}`}
        copyText={csv}
        download={{
          filename: "table.csv",
          content: `${csv}\n`,
          mime: "text/csv;charset=utf-8",
          label: "CSV",
        }}
      />
      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    </div>
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
  // Code first for everything else: an HTML preview runs scripts, so it only
  // starts when the user asks for it. Quizzes are meant to be taken, so they
  // open interactive.
  const [codeView, setCodeView] = React.useState<"code" | "preview">(() =>
    previewKind(language, code) === "quiz" ? "preview" : "code",
  );
  const preview = React.useMemo(
    () => (table ? null : previewKind(language, code)),
    [table, language, code],
  );
  // A quiz's Code view shows the pretty-printed JSON (when it parses).
  const source = React.useMemo(() => {
    if (preview !== "quiz") return code;
    const parsed = parseQuiz(code);
    return parsed.status === "ok" ? parsed.pretty : code;
  }, [preview, code]);
  const highlighted = React.useMemo(
    () => highlightCode(source, preview === "quiz" ? "json" : language),
    [source, preview, language],
  );

  // CSV-ish fenced block: tabular preview + copy/download as .csv.
  if (table) {
    const csv = toCsv(table.header, table.rows);
    return (
      <div className="space-y-2 text-foreground">
        <div className="overflow-hidden rounded-md border border-border bg-muted/40">
          <BlockToolbar
            title={`${lang === "" ? "csv" : lang} · ${table.rows.length} rows`}
            copyText={code}
            download={{
              filename: "data.csv",
              content: code.endsWith("\n") ? code : `${code}\n`,
              mime: "text/csv;charset=utf-8",
              label: "CSV",
            }}
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
          <RichTable
            header={table.header}
            rows={table.rows}
            caption={`CSV preview · ${table.rows.length} rows`}
            copyText={csv}
            download={{
              filename: "data.csv",
              content: `${csv}\n`,
              mime: "text/csv;charset=utf-8",
              label: "CSV",
            }}
          />
        ) : null}
      </div>
    );
  }

  const { ext, mime } = fileInfo(language);
  const showPreview = preview !== null && codeView === "preview";

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/40 text-foreground">
      <BlockToolbar
        title={preview === "quiz" ? "Quiz" : (language ?? preview ?? "code")}
        copyText={source}
        download={{
          filename: `${preview === "html" ? "page" : preview === "quiz" ? "quiz" : "snippet"}.${ext}`,
          content: source.endsWith("\n") ? source : `${source}\n`,
          mime,
          label: ext.toUpperCase(),
        }}
        extra={
          preview ? (
            <div role="group" aria-label="View" className="mr-1 flex rounded border border-border">
              {(["code", "preview"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={codeView === option}
                  onClick={() => setCodeView(option)}
                  className={
                    codeView === option
                      ? "bg-accent px-1.5 py-0.5 text-[11px] text-accent-foreground"
                      : "px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent/60"
                  }
                >
                  {option === "code" ? "Code" : "Preview"}
                </button>
              ))}
            </div>
          ) : null
        }
      />
      {showPreview ? (
        <div className="border-t-0 bg-card text-card-foreground">
          {preview === "markdown" ? (
            <div className="p-3">
              <Markdown content={code} />
            </div>
          ) : preview === "quiz" ? (
            <QuizPreview code={code} renderText={renderQuizText} />
          ) : (
            <CodePreview kind={preview} code={code} />
          )}
        </div>
      ) : (
        <pre className="overflow-x-auto p-3">
          <code className="hljs font-mono text-xs leading-relaxed">{highlighted}</code>
        </pre>
      )}
    </div>
  );
}

/** Quiz questions, options and explanations support Markdown + LaTeX. */
function renderQuizText(text: string): React.ReactNode {
  return <Markdown content={text} />;
}

/**
 * Syntax highlighting as React nodes (no HTML injection). Uses the fence's
 * language when highlight.js knows it, otherwise auto-detects (small blocks).
 */
export function highlightCode(code: string, language: string | null): React.ReactNode {
  const lang = (language ?? "").toLowerCase();
  try {
    let tree: Root | null = null;
    if (lang && lowlight.registered(lang)) {
      tree = lowlight.highlight(lang, code);
    } else if (!lang && code.length <= AUTO_DETECT_MAX) {
      tree = lowlight.highlightAuto(code);
    }
    if (!tree) return code;
    return toJsxRuntime(tree, { Fragment, jsx, jsxs });
  } catch {
    return code;
  }
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
