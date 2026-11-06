"use client";

import * as React from "react";

import { MathView } from "./MathView";

/**
 * Previews for fenced code blocks (the "Preview" side of the Code/Preview
 * toggle). Markdown and quiz previews are rendered by the caller (Markdown.tsx)
 * to avoid a circular import (both render nested Markdown).
 *
 * SAFETY: HTML and SVG run in an iframe sandboxed WITHOUT `allow-same-origin`,
 * so model-written scripts get an opaque origin: no access to this app's
 * DOM, cookies, storage or same-origin API calls. JSON / XML / text are
 * rendered as React text nodes (escaped), never as HTML.
 */

export type PreviewKind = "html" | "svg" | "json" | "xml" | "markdown" | "latex" | "text" | "quiz";

const KIND_BY_LANG: Record<string, PreviewKind> = {
  html: "html",
  htm: "html",
  xhtml: "html",
  svg: "svg",
  json: "json",
  json5: "json",
  geojson: "json",
  xml: "xml",
  xsd: "xml",
  xsl: "xml",
  xslt: "xml",
  rss: "xml",
  atom: "xml",
  plist: "xml",
  md: "markdown",
  markdown: "markdown",
  latex: "latex",
  tex: "latex",
  katex: "latex",
  math: "latex",
  txt: "text",
  text: "text",
  plaintext: "text",
  plain: "text",
  quiz: "quiz",
  "quiz-json": "quiz",
};

/** Which preview (if any) a code block supports. */
export function previewKind(language: string | null, code: string): PreviewKind | null {
  const lang = (language ?? "").trim().toLowerCase();
  if (lang) {
    const kind = KIND_BY_LANG[lang] ?? null;
    if (kind === "xml" && /^\s*<svg[\s>]/i.test(code)) return "svg";
    return kind;
  }
  // No language tag: sniff the obvious cases only.
  const head = code.trimStart().slice(0, 200).toLowerCase();
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return "html";
  if (head.startsWith("<svg")) return "svg";
  if ((head.startsWith("{") || head.startsWith("[")) && parseJson(code).ok) return "json";
  return null;
}

/** Download name + MIME type for a block. */
export function fileInfo(language: string | null): { ext: string; mime: string } {
  const lang = (language ?? "").trim().toLowerCase();
  const table: Record<string, [string, string]> = {
    html: ["html", "text/html"],
    htm: ["html", "text/html"],
    xhtml: ["xhtml", "application/xhtml+xml"],
    svg: ["svg", "image/svg+xml"],
    json: ["json", "application/json"],
    quiz: ["json", "application/json"],
    "quiz-json": ["json", "application/json"],
    json5: ["json5", "application/json"],
    geojson: ["geojson", "application/geo+json"],
    xml: ["xml", "application/xml"],
    md: ["md", "text/markdown"],
    markdown: ["md", "text/markdown"],
    latex: ["tex", "application/x-tex"],
    tex: ["tex", "application/x-tex"],
    css: ["css", "text/css"],
    javascript: ["js", "text/javascript"],
    js: ["js", "text/javascript"],
    jsx: ["jsx", "text/javascript"],
    typescript: ["ts", "text/plain"],
    ts: ["ts", "text/plain"],
    tsx: ["tsx", "text/plain"],
    python: ["py", "text/x-python"],
    py: ["py", "text/x-python"],
    bash: ["sh", "text/x-shellscript"],
    sh: ["sh", "text/x-shellscript"],
    shell: ["sh", "text/x-shellscript"],
    powershell: ["ps1", "text/plain"],
    sql: ["sql", "application/sql"],
    yaml: ["yaml", "application/yaml"],
    yml: ["yml", "application/yaml"],
    csv: ["csv", "text/csv"],
    java: ["java", "text/x-java"],
    c: ["c", "text/x-c"],
    cpp: ["cpp", "text/x-c++"],
    csharp: ["cs", "text/plain"],
    go: ["go", "text/plain"],
    rust: ["rs", "text/plain"],
    php: ["php", "text/plain"],
    ruby: ["rb", "text/plain"],
  };
  const [ext, mime] = table[lang] ?? [
    lang && /^[a-z0-9]{1,8}$/.test(lang) ? lang : "txt",
    "text/plain",
  ];
  return { ext, mime: `${mime};charset=utf-8` };
}

export function parseJson(
  code: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(code) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
}

/** The preview body for a non-markdown kind. */
export function CodePreview({
  kind,
  code,
}: {
  kind: Exclude<PreviewKind, "markdown" | "quiz">;
  code: string;
}) {
  switch (kind) {
    case "html":
      return <SandboxFrame title="HTML preview" doc={code} />;
    case "svg":
      return (
        <SandboxFrame
          title="SVG preview"
          doc={`<!doctype html><html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">${code}</body></html>`}
        />
      );
    case "json":
      return <JsonPreview code={code} />;
    case "xml":
      return <XmlPreview code={code} />;
    case "latex":
      return (
        <div className="overflow-x-auto p-4">
          <MathView latex={code} display />
        </div>
      );
    case "text":
    default:
      return <p className="whitespace-pre-wrap break-words p-3 text-sm leading-relaxed">{code}</p>;
  }
}

// ---------------------------------------------------------------------------
// HTML / SVG
// ---------------------------------------------------------------------------

function SandboxFrame({ title, doc }: { title: string; doc: string }) {
  return (
    // `resize-y` lets the user drag the preview taller.
    <div className="h-96 min-h-40 resize-y overflow-hidden bg-white">
      <iframe
        title={title}
        srcDoc={doc}
        // No allow-same-origin: scripts run in an opaque origin (see SAFETY).
        sandbox="allow-scripts allow-forms allow-modals"
        referrerPolicy="no-referrer"
        className="size-full border-0"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

function JsonPreview({ code }: { code: string }) {
  const parsed = React.useMemo(() => parseJson(code), [code]);
  if (!parsed.ok) return <PreviewError title="Invalid JSON" message={parsed.error} />;
  return (
    <div className="max-h-[32rem] overflow-auto p-3 font-mono text-xs leading-relaxed">
      <JsonNode value={parsed.value} depth={0} />
    </div>
  );
}

function JsonNode({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  const label =
    name !== undefined ? <span className="text-chart-3">{JSON.stringify(name)}: </span> : null;

  if (value === null || typeof value !== "object") {
    return (
      <div>
        {label}
        <JsonScalar value={value} />
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);
  const [open, close] = isArray ? ["[", "]"] : ["{", "}"];

  if (entries.length === 0) {
    return (
      <div>
        {label}
        <span className="text-muted-foreground">{open + close}</span>
      </div>
    );
  }

  return (
    <details open={depth < 2} className="group">
      <summary className="cursor-pointer list-none select-none marker:hidden">
        <span className="inline-block w-3 text-muted-foreground group-open:rotate-90">›</span>
        {label}
        <span className="text-muted-foreground">
          {open}
          <span className="group-open:hidden">
            {` ${entries.length} ${isArray ? (entries.length === 1 ? "item" : "items") : entries.length === 1 ? "key" : "keys"} ${close}`}
          </span>
        </span>
      </summary>
      <div className="ml-4 border-l border-border pl-3">
        {entries.map(([key, child]) => (
          <JsonNode key={key} name={isArray ? undefined : key} value={child} depth={depth + 1} />
        ))}
      </div>
      <span className="text-muted-foreground">{close}</span>
    </details>
  );
}

function JsonScalar({ value }: { value: unknown }) {
  if (typeof value === "string")
    return <span className="text-success">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className="text-warning">{String(value)}</span>;
  if (typeof value === "boolean") return <span className="text-info">{String(value)}</span>;
  return <span className="text-muted-foreground">null</span>;
}

// ---------------------------------------------------------------------------
// XML
// ---------------------------------------------------------------------------

function XmlPreview({ code }: { code: string }) {
  const parsed = React.useMemo(() => {
    if (typeof DOMParser === "undefined") return null;
    const doc = new DOMParser().parseFromString(code, "application/xml");
    const error = doc.getElementsByTagName("parsererror")[0];
    return error
      ? { ok: false as const, error: (error.textContent ?? "Invalid XML").trim().slice(0, 300) }
      : { ok: true as const, root: doc.documentElement };
  }, [code]);

  if (!parsed) return null;
  if (!parsed.ok) return <PreviewError title="Invalid XML" message={parsed.error} />;
  return (
    <div className="max-h-[32rem] overflow-auto p-3 font-mono text-xs leading-relaxed">
      <XmlElement node={parsed.root} depth={0} />
    </div>
  );
}

function XmlElement({ node, depth }: { node: Element; depth: number }) {
  const attributes = Array.from(node.attributes);
  const children = Array.from(node.childNodes).filter(
    (child) =>
      child.nodeType === 1 ||
      ((child.nodeType === 3 || child.nodeType === 4) && (child.textContent ?? "").trim() !== ""),
  );
  const tag = (
    <>
      <span className="text-chart-4">&lt;{node.tagName}</span>
      {attributes.map((attribute) => (
        <span key={attribute.name}>
          {" "}
          <span className="text-chart-3">{attribute.name}</span>=
          <span className="text-success">&quot;{attribute.value}&quot;</span>
        </span>
      ))}
    </>
  );

  if (children.length === 0) {
    return (
      <div>
        {tag}
        <span className="text-chart-4"> /&gt;</span>
      </div>
    );
  }

  // A single text child stays on one line: <name>Ann</name>
  if (children.length === 1 && children[0].nodeType !== 1) {
    return (
      <div>
        {tag}
        <span className="text-chart-4">&gt;</span>
        <span>{(children[0].textContent ?? "").trim()}</span>
        <span className="text-chart-4">&lt;/{node.tagName}&gt;</span>
      </div>
    );
  }

  return (
    <details open={depth < 3} className="group">
      <summary className="cursor-pointer list-none select-none">
        <span className="inline-block w-3 text-muted-foreground group-open:rotate-90">›</span>
        {tag}
        <span className="text-chart-4">&gt;</span>
        <span className="text-muted-foreground group-open:hidden"> … </span>
      </summary>
      <div className="ml-4 border-l border-border pl-3">
        {children.map((child, index) =>
          child.nodeType === 1 ? (
            <XmlElement key={index} node={child as Element} depth={depth + 1} />
          ) : (
            <div key={index}>{(child.textContent ?? "").trim()}</div>
          ),
        )}
      </div>
      <span className="text-chart-4">&lt;/{node.tagName}&gt;</span>
    </details>
  );
}

export function PreviewError({ title, message }: { title: string; message: string }) {
  return (
    <div role="note" className="p-3 text-xs">
      <p className="font-medium text-destructive">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{message}</p>
    </div>
  );
}
