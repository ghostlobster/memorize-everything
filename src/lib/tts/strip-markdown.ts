/**
 * Strips markdown syntax from text so it reads cleanly as speech.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")          // fenced code blocks
    .replace(/`[^`]*`/g, "")                  // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")          // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // links → label text
    .replace(/#{1,6}\s+/g, "")               // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1")       // bold
    .replace(/\*([^*]+)\*/g, "$1")           // italic
    .replace(/__([^_]+)__/g, "$1")           // bold underscore
    .replace(/_([^_]+)_/g, "$1")             // italic underscore
    .replace(/~~([^~]+)~~/g, "$1")           // strikethrough
    .replace(/^[-*+]\s+/gm, "")             // unordered list bullets
    .replace(/^\d+\.\s+/gm, "")             // ordered list numbers
    .replace(/^>\s+/gm, "")                 // blockquotes
    .replace(/\|[^\n]+\|/g, "")             // table rows
    .replace(/[-|:]+/g, "")                  // table separators
    .replace(/\n{3,}/g, "\n\n")             // collapse excess newlines
    .trim();
}
