/**
 * Lightweight markdown → plain text for display. Real models often return
 * markdown (bold, headings, code); our chat/detail views render plain text, so
 * strip the syntax to avoid showing literal ** and # on screen.
 */
export function stripMarkdown(input: string): string {
  if (!input) return input;
  return input
    .replace(/```([\s\S]*?)```/g, "$1") // fenced code
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold **x**
    .replace(/__(.+?)__/g, "$1") // bold __x__
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*/g, "$1$2") // italic *x*
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
    .replace(/^\s{0,3}>\s?/gm, "") // blockquotes
    .trim();
}
