import { describe, expect, it } from "vitest";
import { stripMarkdown } from "./strip-markdown";

describe("stripMarkdown", () => {
  it("strips bold markers", () => {
    expect(stripMarkdown("This is **bold** text")).toBe("This is bold text");
  });

  it("strips italic markers", () => {
    expect(stripMarkdown("This is *italic* text")).toBe("This is italic text");
  });

  it("strips heading markers", () => {
    expect(stripMarkdown("## A heading")).toBe("A heading");
    expect(stripMarkdown("# Another")).toBe("Another");
  });

  it("strips fenced code blocks", () => {
    expect(stripMarkdown("Before\n```\ncode here\n```\nAfter")).toBe("Before\n\nAfter");
  });

  it("strips inline code", () => {
    expect(stripMarkdown("Use the `useState` hook")).toBe("Use the  hook");
  });

  it("converts links to label text", () => {
    expect(stripMarkdown("[Click here](https://example.com)")).toBe("Click here");
  });

  it("strips images", () => {
    expect(stripMarkdown("![alt text](image.png) rest")).toBe("rest");
  });

  it("strips blockquote markers", () => {
    expect(stripMarkdown("> A quote")).toBe("A quote");
  });

  it("strips unordered list bullets", () => {
    expect(stripMarkdown("- item one\n- item two")).toBe("item one\nitem two");
  });

  it("strips ordered list numbers", () => {
    expect(stripMarkdown("1. first\n2. second")).toBe("first\nsecond");
  });

  it("strips strikethrough", () => {
    expect(stripMarkdown("~~deleted~~")).toBe("deleted");
  });

  it("collapses excess newlines", () => {
    expect(stripMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("returns empty string for empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("passes plain text through unchanged", () => {
    expect(stripMarkdown("Just plain text here.")).toBe("Just plain text here.");
  });
});
