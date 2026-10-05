/**
 * Helper to derive a clean chat title from user query content (Item 76).
 *
 * Rules (screen_specs.txt S6):
 * - Strip markdown, code fences, URLs
 * - Take first sentence or line
 * - Collapse whitespace
 * - Trim to <= 60 chars at a word boundary
 * - Add "…" if truncated
 * - Empty fallback -> "New chat"
 */
export function deriveTitle(content: string): string {
  if (!content) return "New chat";

  // 1. Remove code blocks ```...``` and inline code `...`
  let clean = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1");

  // 2. Remove URLs
  clean = clean.replace(/https?:\/\/\S+/gi, "");

  // 3. Remove markdown headers, list bullets, bold/italic symbols
  clean = clean
    .replace(/^#+\s+/gm, "")
    .replace(/^[\*\-+]\s+/gm, "")
    .replace(/[\*_~]/g, "");

  // 4. Take the first non-empty line or first sentence
  const lines = clean.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "New chat";

  let first = lines[0];
  // Break at sentence boundary (period, question mark, exclamation followed by space)
  const sentenceMatch = first.match(/^([^.?!]+[.?!])(\s|$)/);
  if (sentenceMatch) {
    first = sentenceMatch[1];
  }

  // 5. Collapse all whitespace
  first = first.replace(/\s+/g, " ").trim();
  if (!first) return "New chat";

  // 6. Trim to <= 60 characters at a word boundary
  if (first.length <= 60) {
    return first;
  }

  const truncated = first.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 20) {
    return `${truncated.slice(0, lastSpace)}…`;
  }

  return `${truncated}…`;
}
