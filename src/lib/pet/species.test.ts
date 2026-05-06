import { describe, it, expect } from "vitest";
import { categorizeTopic, dominantSpecies } from "./species";

describe("categorizeTopic", () => {
  it.each([
    ["Transformer attention", "cyber_fox"],
    ["Byzantine fault tolerance", "cyber_fox"],
    ["Krebs cycle", "leaf_axolotl"],
    ["Mitochondrial DNA", "leaf_axolotl"],
    ["Roman Empire", "quill_owl"],
    ["Stoic philosophy", "quill_owl"],
    ["Quantum entanglement", "star_octopus"],
    ["General relativity", "star_octopus"],
    ["Music theory: harmony and melody", "crystal_bunny"],
    ["Mandarin grammar", "babel_cat"],
    ["Spanish vocabulary", "babel_cat"],
    ["Knitting socks", "pip"],
    ["", "pip"],
  ])("classifies '%s' → %s", (topic, expected) => {
    expect(categorizeTopic(topic)).toBe(expected);
  });

  it("is case-insensitive", () => {
    expect(categorizeTopic("DEEP LEARNING")).toBe("cyber_fox");
    expect(categorizeTopic("krEBs CYCLE")).toBe("leaf_axolotl");
  });
});

describe("dominantSpecies", () => {
  it("returns pip on empty tally", () => {
    expect(dominantSpecies({})).toBe("pip");
  });

  it("returns the highest-count species", () => {
    expect(
      dominantSpecies({ cyber_fox: 12, leaf_axolotl: 5, pip: 1 }),
    ).toBe("cyber_fox");
  });

  it("ignores zero-count entries", () => {
    expect(dominantSpecies({ pip: 0, cyber_fox: 0 })).toBe("pip");
  });

  it("breaks ties by insertion order", () => {
    expect(
      dominantSpecies({ leaf_axolotl: 5, cyber_fox: 5 }),
    ).toBe("leaf_axolotl");
  });
});
