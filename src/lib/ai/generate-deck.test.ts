import { describe, it, expect } from "vitest";
import { normalizeMermaid, quoteUnsafeLabels } from "./mermaid";

describe("normalizeMermaid", () => {
  it("passes raw mermaid through unchanged", () => {
    const src = "flowchart TD\n  A --> B";
    expect(normalizeMermaid(src)).toBe(src);
  });

  it("strips ```mermaid fences", () => {
    const wrapped = "```mermaid\nflowchart TD\n  A --> B\n```";
    expect(normalizeMermaid(wrapped)).toBe("flowchart TD\n  A --> B");
  });

  it("strips plain ``` fences", () => {
    const wrapped = "```\nflowchart LR\n  X --> Y\n```";
    expect(normalizeMermaid(wrapped)).toBe("flowchart LR\n  X --> Y");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeMermaid("   \nflowchart TD\nA --> B\n  ")).toBe(
      "flowchart TD\nA --> B",
    );
  });

  it("leaves internal whitespace untouched", () => {
    const src = "flowchart TD\n    A --> B\n    B --> C";
    expect(normalizeMermaid(src)).toBe(src);
  });
});

describe("quoteUnsafeLabels", () => {
  it("quotes the failing Logistic Regression input", () => {
    const input = [
      "graph TD",
      "  subgraph Logistic Regression Model",
      "    A[Linear Equation z = β] --> B{Sigmoid Function σ(z)};",
      "    B --> C[Probability p ∈ [0, 1]];",
      "    C --> D{Decision Boundary p=0.5?};",
      "  end",
      "  G[Cost Function: Binary Cross-Entropy] --> H(Gradient Descent);",
      "  I[Logit Function ln(p/(1-p))] --> B;",
    ].join("\n");
    const expected = [
      "graph TD",
      "  subgraph Logistic Regression Model",
      '    A[Linear Equation z = β] --> B{"Sigmoid Function σ(z)"};',
      '    B --> C["Probability p ∈ [0, 1]"];',
      "    C --> D{Decision Boundary p=0.5?};",
      "  end",
      '  G["Cost Function: Binary Cross-Entropy"] --> H(Gradient Descent);',
      '  I["Logit Function ln(p/(1-p))"] --> B;',
    ].join("\n");
    expect(quoteUnsafeLabels(input)).toBe(expected);
  });

  it("quotes square-bracket labels containing parentheses", () => {
    expect(quoteUnsafeLabels("  A[label (with parens)] --> B")).toBe(
      '  A["label (with parens)"] --> B',
    );
  });

  it("quotes square-bracket labels with nested brackets", () => {
    expect(quoteUnsafeLabels("  C[Probability p ∈ [0, 1]]")).toBe(
      '  C["Probability p ∈ [0, 1]"]',
    );
  });

  it("quotes curly-brace labels containing parentheses", () => {
    expect(quoteUnsafeLabels("  B{Sigmoid σ(z)}")).toBe(
      '  B{"Sigmoid σ(z)"}',
    );
  });

  it("quotes round-bracket labels with nested parentheses", () => {
    expect(quoteUnsafeLabels("  C(some (sub) thing)")).toBe(
      '  C("some (sub) thing")',
    );
  });

  it("leaves already-quoted labels alone", () => {
    const src = '  A["already quoted (yes)"] --> B';
    expect(quoteUnsafeLabels(src)).toBe(src);
  });

  it("leaves plain labels untouched", () => {
    const src = "  A[Hello world] --> B{Decision}";
    expect(quoteUnsafeLabels(src)).toBe(src);
  });

  it("preserves stadium shape A([Stadium])", () => {
    const src = "  A([Stadium]) --> B";
    expect(quoteUnsafeLabels(src)).toBe(src);
  });

  it("does not touch directive lines (subgraph, style, classDef)", () => {
    const src = [
      "flowchart TD",
      "  subgraph SG1",
      "    style A fill:#f96",
      "    classDef foo fill:#0f0,stroke:#333",
      "  end",
    ].join("\n");
    expect(quoteUnsafeLabels(src)).toBe(src);
  });

  it("leaves edge labels unchanged (intentional v1 scope)", () => {
    const src = '  A -->|"if x > 0"| B\n  A -- yes --> B';
    expect(quoteUnsafeLabels(src)).toBe(src);
  });

  it("escapes embedded double quotes when wrapping", () => {
    expect(quoteUnsafeLabels('  A[He said "hi" (loudly)]')).toBe(
      '  A["He said &quot;hi&quot; (loudly)"]',
    );
  });

  it("normalizeMermaid runs the sanitizer end-to-end", () => {
    const wrapped =
      "```mermaid\nflowchart TD\n  A --> B{Sigmoid σ(z)}\n```";
    expect(normalizeMermaid(wrapped)).toBe(
      'flowchart TD\n  A --> B{"Sigmoid σ(z)"}',
    );
  });
});
