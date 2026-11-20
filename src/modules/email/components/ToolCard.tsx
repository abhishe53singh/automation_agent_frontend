import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Switch } from "@/shared/ui/Switch";

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "active" | "coming_soon";
  href?: string;
  badgeText?: string;
  showSwitch?: boolean;
  switchChecked?: boolean;
  onSwitchChange?: (checked: boolean) => void;
}

export function ToolCard({
  title,
  description,
  icon,
  status,
  href = "#",
  badgeText,
  showSwitch = false,
  switchChecked = false,
  onSwitchChange,
}: ToolCardProps) {
  const isActive = status === "active";

  return (
    <Card
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-6 transition-all duration-200 ${
        isActive
          ? "border-border bg-card shadow-sm hover:border-primary/50 hover:shadow-md"
          : "border-border/60 bg-muted/20 opacity-80"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              isActive
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </div>

          {showSwitch ? (
            <div
              className="flex items-center gap-2"
              title={switchChecked ? "Visible on left sidebar" : "Hidden from sidebar"}
            >
              <Switch
                checked={switchChecked}
                onCheckedChange={onSwitchChange}
                aria-label="Toggle sidebar shortcut"
              />
            </div>
          ) : (
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary/90" : "bg-muted text-muted-foreground"}
            >
              {badgeText || (isActive ? "Active" : "Coming Soon")}
            </Badge>
          )}
        </div>

        <h3 className="mt-4 text-lg font-semibold text-foreground tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-border/40">
        {isActive ? (
          <Button asChild className="w-full justify-between" variant="default">
            <Link href={href}>
              <span>Open Tool</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        ) : (
          <Button disabled className="w-full" variant="outline">
            Coming Soon
          </Button>
        )}
      </div>
    </Card>
  );
}
