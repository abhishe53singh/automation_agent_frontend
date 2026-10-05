/** Barrel for the shared UI primitives. Import from "@/shared/ui". */
export { Badge, badgeVariants, type BadgeProps } from "./Badge";
export { Button, buttonVariants, type ButtonProps } from "./Button";
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./Card";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { Input, type InputProps } from "./Input";
export { Spinner, SpinnerBlock, type SpinnerProps } from "./Spinner";
export { Skeleton, SkeletonText, type SkeletonProps } from "./Skeleton";
export { Dialog, type DialogProps } from "./Dialog";
export { Select, type SelectProps } from "./Select";
export {
  AsyncBoundary,
  CardGridSkeleton,
  ErrorNotice,
  PanelSkeleton,
  type AsyncBoundaryProps,
  type DataSkeletonProps,
  type ErrorNoticeProps,
} from "./AsyncBoundary";

/* Newly added primitives and templates (Items 70-71) */
export { Textarea, type TextareaProps } from "./Textarea";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./Tooltip";
export { Switch, type SwitchProps } from "./Switch";
export { Checkbox, type CheckboxProps } from "./Checkbox";
export { Avatar, type AvatarProps } from "./Avatar";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./DropdownMenu";
export { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";
export { Drawer, type DrawerProps } from "./Drawer";
export { RelativeTime, type RelativeTimeProps } from "./RelativeTime";
export { CopyButton, type CopyButtonProps } from "./CopyButton";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  RouteTabs,
  type RouteTab,
  type RouteTabsProps,
} from "./Tabs";
export {
  PageHeader,
  PageSection,
  type PageHeaderProps,
  type PageSectionProps,
} from "./PageHeader";
export { Breadcrumbs, type BreadcrumbItem, type BreadcrumbsProps } from "./Breadcrumbs";
export { SplitPane, type SplitPaneProps } from "./SplitPane";
