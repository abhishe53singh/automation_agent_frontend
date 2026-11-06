// Vitest globals (no `import from "vitest"`), as in chat-parsers.test.ts.
import { fireEvent, render, screen } from "@testing-library/react";

import { fileInfo, previewKind } from "@/modules/chat/components/CodePreview";
import { Markdown } from "@/modules/chat/components/Markdown";

const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body}\n\`\`\``;

function openPreview(content: string) {
  const view = render(<Markdown content={content} />);
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  return view.container;
}

describe("previewKind", () => {
  it("maps languages and sniffs untagged blocks", () => {
    expect(previewKind("html", "<p>x</p>")).toBe("html");
    expect(previewKind("HTM", "")).toBe("html");
    expect(previewKind("xml", "<svg viewBox='0 0 1 1'></svg>")).toBe("svg");
    expect(previewKind("json", "{}")).toBe("json");
    expect(previewKind("markdown", "# x")).toBe("markdown");
    expect(previewKind("tex", "x^2")).toBe("latex");
    expect(previewKind("txt", "hi")).toBe("text");
    expect(previewKind("python", "print(1)")).toBeNull();
    expect(previewKind(null, "<!DOCTYPE html><html></html>")).toBe("html");
    expect(previewKind(null, '{"a": 1}')).toBe("json");
    expect(previewKind(null, "{ not json")).toBeNull();
  });

  it("picks real file extensions for downloads", () => {
    expect(fileInfo("html").ext).toBe("html");
    expect(fileInfo("python").ext).toBe("py");
    expect(fileInfo("json").mime).toContain("application/json");
    expect(fileInfo(null).ext).toBe("txt");
  });
});

describe("Code / Preview toggle", () => {
  it("starts on Code (nothing runs) and offers Preview, Copy and a typed download", () => {
    const { container } = render(<Markdown content={fence("html", "<button>1</button>")} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Code" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "HTML" })).toBeTruthy();
  });

  it("previews HTML in a sandbox without same-origin access", () => {
    const root = openPreview(
      fence("html", "<!DOCTYPE html><html><body><button>7</button></body></html>"),
    );
    const frame = root.querySelector("iframe");
    expect(frame).not.toBeNull();
    const sandbox = frame?.getAttribute("sandbox") ?? "";
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).not.toContain("allow-same-origin");
    expect(frame?.getAttribute("srcdoc")).toContain("<button>7</button>");
  });

  it("previews JSON as a collapsible tree", () => {
    const root = openPreview(fence("json", '{"name":"Ann","tags":["a","b"],"ok":true,"n":null}'));
    expect(root.querySelector("details")).not.toBeNull();
    expect(root.textContent).toContain('"Ann"');
    expect(root.textContent).toContain("true");
  });

  it("explains invalid JSON instead of crashing", () => {
    const root = openPreview(fence("json", '{"a": }'));
    expect(root.querySelector('[role="note"]')?.textContent).toContain("Invalid JSON");
  });

  it("previews XML as an element tree", () => {
    const root = openPreview(fence("xml", '<note id="1"><to>Ann</to><body>Hi</body></note>'));
    expect(root.textContent).toContain("<to");
    expect(root.textContent).toContain("Ann");
    expect(root.textContent).toContain('id="1"');
  });

  it("previews Markdown and LaTeX with the rich renderer", () => {
    const md = openPreview(fence("markdown", "## Title\n\n**bold**"));
    expect(md.querySelector("strong")?.textContent).toBe("bold");
  });

  it("previews LaTeX", () => {
    const root = openPreview(fence("latex", String.raw`\frac{a}{b}`));
    expect(root.querySelector(".katex")).not.toBeNull();
  });

  it("leaves non-previewable code without a toggle", () => {
    render(<Markdown content={fence("python", "print(1)")} />);
    expect(screen.queryByRole("button", { name: "Preview" })).toBeNull();
    expect(screen.getByRole("button", { name: "PY" })).toBeTruthy();
  });
});
