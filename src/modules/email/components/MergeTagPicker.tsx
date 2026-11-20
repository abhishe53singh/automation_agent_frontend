"use client";

import { Code2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/ui/DropdownMenu";
import { Button } from "@/shared/ui/Button";

interface MergeTagPickerProps {
  onSelectTag: (tag: string) => void;
}

const STANDARD_TAGS = [
  { tag: "{{first_name}}", label: "First Name", desc: "e.g. John" },
  { tag: "{{last_name}}", label: "Last Name", desc: "e.g. Smith" },
  { tag: "{{company}}", label: "Company", desc: "e.g. Acme Corp" },
  { tag: "{{title}}", label: "Job Title", desc: "e.g. VP Engineering" },
  { tag: "{{email}}", label: "Email Address", desc: "e.g. recipient@domain.com" },
  { tag: "{{unsubscribe_link}}", label: "Unsubscribe Link", desc: "Auto CAN-SPAM URL" },
];

export function MergeTagPicker({ onSelectTag }: MergeTagPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          <span>Insert Merge Tag</span>
          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Dynamic Contact Variables
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STANDARD_TAGS.map((item) => (
          <DropdownMenuItem
            key={item.tag}
            onClick={() => onSelectTag(item.tag)}
            className="flex flex-col items-start gap-0.5 py-1.5 cursor-pointer"
          >
            <span className="font-mono text-xs font-semibold text-primary">
              {item.tag}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {item.label} ({item.desc})
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
