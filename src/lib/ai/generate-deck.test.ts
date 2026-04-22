import { describe, it, expect } from "vitest";
import { normalizeMermaid } from "./mermaid";

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
