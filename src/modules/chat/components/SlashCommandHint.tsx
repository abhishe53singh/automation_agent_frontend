"use client";

import * as React from "react";

/**
 * Slash-command suggestions for the composer. Purely a typing aid: the message
 * is sent exactly as typed and the backend recognises the prefix itself.
 */

export interface SlashCommand {
  /** Including the slash, e.g. "/quiz". */
  name: string;
  usage: string;
  description: string;
}

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  { name: "/quiz", usage: "/quiz <prompt>", description: "Create an interactive quiz" },
];

/** Commands to suggest for the current composer text (only while typing the command word). */
export function matchSlashCommands(content: string): SlashCommand[] {
  if (!content.startsWith("/") || /\s/.test(content)) return [];
  const typed = content.toLowerCase();
  return SLASH_COMMANDS.filter((command) => command.name.startsWith(typed));
}

/** The text the composer holds after picking a command. */
export function completeSlashCommand(command: SlashCommand): string {
  return `${command.name} `;
}

export function SlashCommandHint({
  commands,
  onPick,
}: {
  commands: SlashCommand[];
  onPick: (command: SlashCommand) => void;
}) {
  if (commands.length === 0) return null;
  return (
    <div
      aria-label="Commands"
      role="group"
      className="flex flex-col gap-0.5 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-sm"
    >
      {commands.map((command) => (
        <button
          key={command.name}
          type="button"
          // Keep focus in the textarea.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(command)}
          className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
        >
          <span className="font-mono text-foreground">{command.usage}</span>
          <span className="text-muted-foreground">— {command.description}</span>
          <kbd
            aria-hidden
            className="ml-auto rounded border border-border px-1 text-[10px] text-muted-foreground"
          >
            Tab
          </kbd>
        </button>
      ))}
    </div>
  );
}
