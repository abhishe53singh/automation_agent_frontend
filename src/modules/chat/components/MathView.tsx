"use client";

import * as React from "react";

/**
 * Tiny dependency-free LaTeX renderer for common LLM output.
 * Supports: \frac, \sqrt, superscripts ^, subscripts _, \times \cdot \pm
 * \leq \geq \neq \approx \infty \pi \alpha..\omega, \sum \int \prod \lim.
 * Anything unknown falls back to styled monospace text — never crashes,
 * never injects HTML.
 */
export function MathView({ latex, display }: { latex: string; display?: boolean }) {
  const nodes = React.useMemo(() => renderLatex(latex), [latex]);
  if (display) {
    return (
      <div className="overflow-x-auto rounded-md border border-border bg-muted/40 px-4 py-3 text-center">
        <span className="font-serif text-[15px] leading-relaxed text-foreground">{nodes}</span>
      </div>
    );
  }
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-serif text-[0.95em] text-foreground">{nodes}</code>
  );
}

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ",
  eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ",
  upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ",
  Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

const SYMBOLS: Record<string, string> = {
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓",
  leq: "≤", geq: "≥", neq: "≠", approx: "≈", equiv: "≡",
  infty: "∞", partial: "∂", nabla: "∇", forall: "∀", exists: "∃",
  in: "∈", ni: "∋", subset: "⊂", cup: "∪", cap: "∩",
  rightarrow: "→", leftarrow: "←", to: "→",
  sum: "∑", prod: "∏", int: "∫", lim: "lim",
};

function renderLatex(input: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const push = (n: React.ReactNode) => {
    out.push(<React.Fragment key={key++}>{n}</React.Fragment>);
  };
  const readGroup = (s: string, start: number): { text: string; next: number } => {
    if (s[start] === "{") {
      let depth = 0;
      for (let j = start; j < s.length; j++) {
        if (s[j] === "{") depth++;
        if (s[j] === "}") {
          depth--;
          if (depth === 0) return { text: s.slice(start + 1, j), next: j + 1 };
        }
      }
      return { text: s.slice(start + 1), next: s.length };
    }
    return { text: s[start] ?? "", next: start + 1 };
  };

  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(input.slice(i));
      if (!m) {
        push(ch);
        i++;
        continue;
      }
      const name = m[1];
      i += name.length + 1;
      if (name === "frac") {
        const a = readGroup(input, i);
        const b = readGroup(input, a.next);
        i = b.next;
        push(
          <span className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.9em] leading-tight">
            <span className="border-b border-current px-1">{renderLatex(a.text)}</span>
            <span className="px-1">{renderLatex(b.text)}</span>
          </span>,
        );
      } else if (name === "sqrt") {
        const g = readGroup(input, i);
        i = g.next;
        push(<span>√<span className="overline">({renderLatex(g.text)})</span></span>);
      } else if (name === "text" || name === "mathrm") {
        const g = readGroup(input, i);
        i = g.next;
        push(<span className="font-sans">{g.text}</span>);
      } else if (GREEK[name]) {
        push(<i>{GREEK[name]}</i>);
      } else if (SYMBOLS[name]) {
        push(<span>{SYMBOLS[name]}</span>);
      } else {
        push(<span>\{name}</span>);
      }
      continue;
    }
    if (ch === "^" || ch === "_") {
      const g = readGroup(input, i + 1);
      i = g.next;
      push(
        ch === "^" ? (
          <sup className="text-[0.75em]">{renderLatex(g.text)}</sup>
        ) : (
          <sub className="text-[0.75em]">{renderLatex(g.text)}</sub>
        ),
      );
      continue;
    }
    if (ch === "{" || ch === "}") {
      i++;
      continue;
    }
    push(ch);
    i++;
  }
  return out;
}
