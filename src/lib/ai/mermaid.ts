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

const DIRECTIVE_RE =
  /^\s*(flowchart|graph|subgraph|end|click|classDef|class|style|linkStyle|direction)\b/i;
const COMMENT_RE = /^\s*%%/;
const TRIGGER_RE = /[()\[\];#:<>&`]/;
const OPENERS = new Set(["[", "{", "("]);
const CLOSER: Record<string, string> = { "[": "]", "{": "}", "(": ")" };

function maybeQuote(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length === 0) return label;
  if (/^".*"$/.test(trimmed)) return label;
  if (!TRIGGER_RE.test(trimmed)) return label;
  return `"${trimmed.replace(/"/g, "&quot;")}"`;
}

/**
 * Wrap node labels in double quotes when they contain Mermaid-reserved
 * characters. Uses balanced-bracket depth counting so nested brackets
 * like [0, 1] inside a label are handled correctly. Targets the three
 * common shapes: id[label], id{label}, id(label). Skips exotic nested
 * forms ([[]], {{}}, (()), [(...)], [/.../]) and edge labels.
 */
export function quoteUnsafeLabels(src: string): string {
  return src
    .split("\n")
    .map((line) => {
      if (line.trim().length === 0) return line;
      if (COMMENT_RE.test(line)) return line;
      if (DIRECTIVE_RE.test(line)) return line;
      return rewriteNodeLabels(line);
    })
    .join("\n");
}

function rewriteNodeLabels(line: string): string {
  let result = "";
  let pos = 0;

  while (pos < line.length) {
    const ch = line[pos];

    // Not an id-start character — copy verbatim
    if (!/[A-Za-z_]/.test(ch)) {
      result += ch;
      pos++;
      continue;
    }

    // Capture the full identifier
    const idStart = pos;
    while (pos < line.length && /[\w-]/.test(line[pos])) pos++;
    const id = line.slice(idStart, pos);

    const opener = line[pos] ?? "";

    // Must be preceded by nothing, whitespace, or punctuation
    const prevChar = result.length > 0 ? result[result.length - 1] : "";
    const validPrefix =
      result.length === 0 || /[\s,;&|>]/.test(prevChar);

    if (!validPrefix || !OPENERS.has(opener)) {
      result += id;
      continue;
    }

    // Skip exotic nested shapes: [[, {{, ((, [(, [/, [\
    const afterOpen = line[pos + 1] ?? "";
    if (opener === "[" && /[\[(/\\]/.test(afterOpen)) {
      result += id;
      continue;
    }
    if (opener === "{" && afterOpen === "{") {
      result += id;
      continue;
    }
    if (opener === "(" && /[(\[]/.test(afterOpen)) {
      result += id;
      continue;
    }

    // Skip if we're inside a "..." region already emitted in result
    const quoteCount = (result.match(/"/g) ?? []).length;
    if (quoteCount % 2 === 1) {
      result += id;
      continue;
    }

    // Balanced-bracket depth count to find the matching closer
    const closer = CLOSER[opener];
    let depth = 1;
    let i = pos + 1;
    while (i < line.length && depth > 0) {
      if (line[i] === opener) depth++;
      else if (line[i] === closer) depth--;
      i++;
    }

    if (depth !== 0) {
      // Unmatched bracket — leave as-is
      result += id;
      continue;
    }

    const closeIdx = i - 1;
    const label = line.slice(pos + 1, closeIdx);
    result += id + opener + maybeQuote(label) + closer;
    pos = closeIdx + 1;
  }

  return result;
}
