/**
 * Shared date formatting utilities (rule R7, issue K14).
 * Kept locale-stable so server and client match for hydration.
 */

/** Shared, locale-stable short date (YYYY-MM-DD). */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toISOString().slice(0, 10);
}
