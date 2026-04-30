/**
 * Strip accidental markdown code fences an LLM sometimes wraps around a
 * mermaid diagram, trim whitespace, and defensively quote node labels that
 * contain Mermaid-reserved characters like (), [], ;, #, : when the model
 * forgot to quote them. See quoteUnsafeLabels for scope and limitations.
 */
export function normalizeMermaid(src: string): string {
  let s = src.trim();
  s = s.replace(/^```(?:mermaid)?\s*/i, "").replace(/```\s*$/i, "");
  s = quoteUnsafeLabels(s.trim());
  return s;
}

const SQUARE = /(^|[\s,;&|>])([A-Za-z_][\w-]*)\[(?!\[|\(|\/|\\)([^\]\n]*?)\]/g;
const CURLY = /(^|[\s,;&|>])([A-Za-z_][\w-]*)\{(?!\{)([^}\n]*?)\}/g;
const ROUND = /(^|[\s,;&|>])([A-Za-z_][\w-]*)\((?!\(|\[)([^)\n]*?)\)/g;

const DIRECTIVE_RE =
  /^\s*(flowchart|graph|subgraph|end|click|classDef|class|style|linkStyle|direction)\b/i;
const COMMENT_RE = /^\s*%%/;
const TRIGGER_RE = /[()\[\];#:<>&`]/;

function maybeQuote(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length === 0) return label;
  if (/^".*"$/.test(trimmed)) return label;
  if (!TRIGGER_RE.test(trimmed)) return label;
  return `"${trimmed.replace(/"/g, "&quot;")}"`;
}

function isInsideQuotes(str: string, offset: number): boolean {
  let count = 0;
  for (let i = 0; i < offset; i++) {
    if (str[i] === '"') count++;
  }
  return count % 2 === 1;
}

/**
 * Wrap node labels in double quotes when they contain Mermaid-reserved
 * characters. Targets the three common shapes: id[label], id{label},
 * id(label). Skips nested forms ([[]], {{}}, (()), [(...)], [/.../])
 * and edge labels (those need different handling and are usually fine).
 *
 * Passes run in order SQUARE -> CURLY -> ROUND. After an outer label is
 * quoted, inner shapes nested inside the new "..." must not be re-quoted.
 * Each replacer checks the match offset against the current string and
 * leaves matches inside "..." regions alone.
 */
export function quoteUnsafeLabels(src: string): string {
  return src
    .split("\n")
    .map((line) => {
      if (line.trim().length === 0) return line;
      if (COMMENT_RE.test(line)) return line;
      if (DIRECTIVE_RE.test(line)) return line;
      return line
        .replace(
          SQUARE,
          (
            match: string,
            prefix: string,
            id: string,
            label: string,
            offset: number,
            str: string,
          ) =>
            isInsideQuotes(str, offset)
              ? match
              : `${prefix}${id}[${maybeQuote(label)}]`,
        )
        .replace(
          CURLY,
          (
            match: string,
            prefix: string,
            id: string,
            label: string,
            offset: number,
            str: string,
          ) =>
            isInsideQuotes(str, offset)
              ? match
              : `${prefix}${id}{${maybeQuote(label)}}`,
        )
        .replace(
          ROUND,
          (
            match: string,
            prefix: string,
            id: string,
            label: string,
            offset: number,
            str: string,
          ) =>
            isInsideQuotes(str, offset)
              ? match
              : `${prefix}${id}(${maybeQuote(label)})`,
        );
    })
    .join("\n");
}
