import { cn } from "@/shared/lib/cn";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Placeholder block (.agent/phase_3.txt item 27). Every loading state in the
 * app renders skeletons that match the real layout's box model, so the swap to
 * loaded content does not move anything (no CLS).
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-md bg-muted/60", className)} {...props} />
  );
}

/** Multi-line text skeleton; `lines` rows of `h-4` separated by 0.5rem. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
