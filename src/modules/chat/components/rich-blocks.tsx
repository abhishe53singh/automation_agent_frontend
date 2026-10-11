"use client";

import * as React from "react";
import { Check, Copy, Download } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export function useCopyText(text: string, timeoutMs = 1500) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        return;
      }
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), timeoutMs);
  }, [text, timeoutMs]);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return { copied, copy };
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(header: string[], rows: string[][]): string {
  const escape = (cell: string) => {
    const value = cell ?? "";
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export function ToolButton({
  onClick,
  label,
  copied,
  icon,
}: {
  onClick: () => void;
  label: string;
  copied?: boolean;
  icon: "copy" | "download";
}) {
  const Icon = copied ? Check : icon === "copy" ? Copy : Download;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon aria-hidden className="size-3" />
      {copied ? "Copied" : label}
    </button>
  );
}

export function BlockToolbar({
  title,
  copyText,
  download,
  extra,
}: {
  title: string;
  copyText?: string;
  download?: { filename: string; content: string; mime?: string; label?: string };
  extra?: React.ReactNode;
}) {
  const { copied, copy } = useCopyText(copyText ?? "");
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
      <span className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{title}</span>
      <div className="flex shrink-0 items-center gap-1">
        {extra}
        {copyText ? <ToolButton onClick={() => void copy()} label="Copy" copied={copied} icon="copy" /> : null}
        {download ? (
          <ToolButton
            onClick={() => downloadTextFile(download.filename, download.content, download.mime)}
            label={download.label ?? "Download"}
            icon="download"
          />
        ) : null}
      </div>
    </div>
  );
}

export type TableAlign = "left" | "center" | "right";

const ALIGN_CLASS: Record<TableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right tabular-nums",
};

export function RichTable({
  header,
  rows,
  align,
  caption,
  copyText,
  download,
}: {
  header: string[];
  rows: string[][];
  align?: TableAlign[];
  caption?: string;
  copyText?: string;
  download?: { filename: string; content: string; mime?: string; label?: string };
}) {
  const csv = React.useMemo(() => copyText ?? toCsv(header, rows), [copyText, header, rows]);
  return (
    <figure className="overflow-hidden rounded-md border border-border bg-card">
      <BlockToolbar
        title={caption ?? `Table · ${rows.length} row${rows.length === 1 ? "" : "s"}`}
        copyText={csv}
        download={download ?? { filename: "table.csv", content: csv, mime: "text/csv;charset=utf-8", label: "CSV" }}
      />
      <div className={cn("max-h-80 overflow-auto")}>
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap border-b border-border px-3 py-2 text-xs font-semibold text-foreground",
                    ALIGN_CLASS[align?.[i] ?? "left"],
                  )}
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={r % 2 === 1 ? "bg-muted/30" : undefined}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      "max-w-64 truncate border-b border-border/60 px-3 py-1.5 align-top text-foreground",
                      ALIGN_CLASS[align?.[c] ?? "left"],
                    )}
                    title={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
