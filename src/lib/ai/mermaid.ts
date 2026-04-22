/**
 * Strip accidental markdown code fences an LLM sometimes wraps around a
 * mermaid diagram, and trim surrounding whitespace.
 */
export function normalizeMermaid(src: string): string {
  let s = src.trim();
  s = s.replace(/^```(?:mermaid)?\s*/i, "").replace(/```\s*$/i, "");
  return s.trim();
}
