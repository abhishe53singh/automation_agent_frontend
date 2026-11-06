"use client";

import "katex/dist/katex.min.css";

import katex from "katex";
import * as React from "react";

/**
 * Standalone LaTeX renderer (KaTeX). Chat content goes through `Markdown`,
 * which renders math the same way; this is for one-off formulas elsewhere.
 *
 * SAFETY: `trust: false` blocks \href/\url/\includegraphics-style commands,
 * and KaTeX escapes all text, so its HTML output is safe to inject. Errors
 * render as the raw source instead of throwing.
 */
export function MathView({ latex, display }: { latex: string; display?: boolean }) {
  const html = React.useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: Boolean(display),
        throwOnError: false,
        strict: "ignore",
        trust: false,
      }),
    [latex, display],
  );

  const Tag = display ? "div" : "span";
  return (
    <Tag
      className={display ? "rich-content overflow-x-auto py-1" : "rich-content"}
      // KaTeX output with trust:false (see SAFETY above).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
