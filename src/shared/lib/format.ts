/**
 * Shared formatting helpers (rule R7 — shared by 2+ modules).
 * Kept locale-stable so server and client match for hydration.
 */

/** Human file size ("1.2 MB"), Intl-aware. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value >= 100 || index === 0 ? 0 : 1,
  }).format(value);
  return `${formatted} ${units[index]}`;
}
