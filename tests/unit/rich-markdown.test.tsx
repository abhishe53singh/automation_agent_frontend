// No `import ... from "vitest"`: this suite relies on vitest globals (see
// chat-parsers.test.ts for why).
import { render } from "@testing-library/react";

import { Markdown } from "@/modules/chat/components/Markdown";
import { normalizeMath } from "@/modules/chat/markdown";

// The exact message from the bug report: bare LaTeX, no $ delimiters.
const REPORTED = String.raw`just return this text  as it is

\boxed{
\begin{aligned}
\mathcal{F}_{i,j}^{(n+1)}
&=\lim_{\varepsilon\to0^+}
\left\{\frac{\displaystyle\sum_{k=1}^{N}
\frac{(-1)^{k+1}\left[\displaystyle\prod_{r=1}^{m}
\left(\frac{x_{i,r}^{\alpha_k+\beta_j}}{1+\lambda_r^2}\right)\right]}
{\sqrt{1+\displaystyle\sum_{s=0}^{p}\frac{a_s^{2s+1}}{(s+1)!}}}}
{\displaystyle\int_0^\infty\frac{t^{\mu_k-1}e^{-\gamma t}}{1+t^{2\nu}}\,dt+\varepsilon}\right\}
\\
&+\frac{\det\begin{bmatrix}
a_{11}^{2}&a_{12}^{-1}&\cdots&a_{1n}^{n}\\
a_{21}^{3}&a_{22}^{-2}&\cdots&a_{2n}^{n+1}\\
\vdots&\vdots&\ddots&\vdots\\
a_{n1}^{n}&a_{n2}^{-n}&\cdots&a_{nn}^{2n}
\end{bmatrix}}
{\left|\begin{matrix}1&\alpha&\alpha^2\\
\beta&\beta^2&\beta^3\\
\gamma&\gamma^2&\gamma^3\end{matrix}\right|^\rho}
\\
&+\left[\frac{\left(\sum_{u=1}^{q}
\left(\frac{\partial^{u+v}f(x,y)}
{\partial x^u\partial y^v}\right)^2\right)^{1/2}}
{\prod_{\ell=1}^{q}\left(1+\frac{\hbar^2\ell^2}{M^2c^2}\right)}
\right]_{x=x_0,y=y_0}
\\
&-\sqrt[\kappa]{\frac{\displaystyle\sum_{a=0}^{A}\sum_{b=0}^{B}
\binom{A}{a}\binom{B}{b}(-1)^{a+b}(x^ay^b)^2}
{\displaystyle1+\left(\frac{\partial^2z}{\partial x^2}+
\frac{\partial^2z}{\partial y^2}\right)^2}}
\end{aligned}}`;

function html(content: string, tone?: "default" | "inverse") {
  return render(<Markdown content={content} tone={tone} />).container;
}

describe("normalizeMath", () => {
  it("wraps a bare LaTeX environment paragraph in $$", () => {
    const out = normalizeMath(REPORTED);
    expect(out.startsWith("just return this text")).toBe(true);
    expect(out).toContain("$$\n\\boxed{");
  });

  it("converts \\[ \\] and \\( \\) delimiters", () => {
    expect(normalizeMath(String.raw`a \(x^2\) b`)).toBe("a $x^2$ b");
    expect(normalizeMath(String.raw`\[E=mc^2\]`)).toContain("$$\nE=mc^2\n$$");
  });

  it("never rewrites code", () => {
    const fenced = "```latex\n\\begin{aligned}a&=b\\end{aligned}\n```";
    expect(normalizeMath(fenced)).toBe(fenced);
    expect(normalizeMath("use `\\(x\\)` literally")).toBe("use `\\(x\\)` literally");
  });
});

describe("Markdown (rich renderer)", () => {
  it("renders the reported formula with KaTeX and no errors", () => {
    const root = html(REPORTED, "inverse");
    expect(root.querySelector(".katex-display")).not.toBeNull();
    expect(root.querySelector(".katex-error")).toBeNull();
    expect(root.textContent).toContain("just return this text");
    // The raw source must not leak through as text.
    expect(root.querySelector("p")?.textContent ?? "").not.toContain("\\begin{aligned}");
  });

  it("renders inline and display math with every delimiter style", () => {
    const root = html(String.raw`Inline $a^2$ and \(b_1\).

$$\int_0^1 x\,dx$$

\[\sum_{i=1}^n i\]`);
    expect(root.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(4);
    expect(root.querySelectorAll(".katex-display").length).toBe(2);
    expect(root.querySelector(".katex-error")).toBeNull();
  });

  it("renders GFM tables with formatted cells and a CSV toolbar", () => {
    const root = html("| Name | Score |\n|---|---:|\n| **Ann** | $9^2$ |\n| Bob | `7` |");
    expect(root.querySelector("table")).not.toBeNull();
    expect(root.querySelector("td strong")?.textContent).toBe("Ann");
    expect(root.querySelector("td .katex")).not.toBeNull();
    expect(root.textContent).toContain("Table · 2 rows");
  });

  it("highlights fenced code as elements", () => {
    const root = html("```python\ndef f(x):\n    return x + 1  # inc\n```");
    expect(root.querySelector("pre code .hljs-keyword")?.textContent).toBe("def");
    expect(root.querySelector("pre code .hljs-comment")).not.toBeNull();
  });

  it("supports task lists and strikethrough", () => {
    const root = html("- [x] done\n- [ ] todo\n\n~~old~~");
    expect(root.querySelectorAll('input[type="checkbox"]').length).toBe(2);
    expect(root.querySelector("del")?.textContent).toBe("old");
  });

  it("does not render raw HTML or unsafe links", () => {
    const root = html(
      '<img src=x onerror="alert(1)"> [x](javascript:alert(1)) <script>bad()</script>',
    );
    expect(root.querySelector("script")).toBeNull();
    expect(root.querySelector("img")).toBeNull();
    const link = root.querySelector("a");
    expect(link === null || !link.getAttribute("href")?.startsWith("javascript")).toBe(true);
  });

  it("shows a readable fallback for invalid LaTeX (unbalanced braces)", () => {
    // Same defect as the bug report: one `}` too many.
    const broken = String.raw`\boxed{
\begin{aligned}
x &= \frac{a}{b}}
\end{aligned}}`;
    const root = html(`just return this\n\n${broken}`, "inverse");
    const note = root.querySelector('[role="note"]');
    expect(note?.textContent).toContain("Formula couldn't be rendered");
    expect(note?.querySelector("code")?.textContent).toContain(String.raw`\begin{aligned}`);
    expect(root.querySelector(".katex-error")).toBeNull();
  });

  it("keeps KaTeX's internal attributes (aria-hidden) on pass-through spans", () => {
    const root = html("$x^2$");
    expect(root.querySelector('.katex-html[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("KaTeX packaging", () => {
  it("uses a single KaTeX copy so markup and CSS always match", async () => {
    // rehype-katex bundling its own (older) KaTeX made `\boxed` collapse into
    // a stray vertical line: its markup used class names our CSS lacked.
    const fs = await import("node:fs");
    expect(fs.existsSync("node_modules/rehype-katex/node_modules/katex")).toBe(false);
    expect(fs.existsSync("node_modules/micromark-extension-math/node_modules/katex")).toBe(false);
  });
});
