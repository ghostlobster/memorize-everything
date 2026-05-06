import type { PetSpecies } from "@/lib/db/schema";

interface SpeciesRule {
  species: PetSpecies;
  /** Whole-word matchers (case-insensitive). Multi-word entries match as substrings. */
  keywords: readonly string[];
}

const RULES: readonly SpeciesRule[] = [
  {
    species: "cyber_fox",
    keywords: [
      "math",
      "maths",
      "algebra",
      "calculus",
      "geometry",
      "statistics",
      "statistical",
      "probability",
      "algorithm",
      "algorithms",
      "data structure",
      "data structures",
      "code",
      "coding",
      "program",
      "programming",
      "computer",
      "compiler",
      "transformer",
      "transformers",
      "neural",
      "machine learning",
      "deep learning",
      "ai",
      "artificial intelligence",
      "software",
      "engineering",
      "cryptography",
      "byzantine",
      "fault tolerance",
      "distributed",
      "database",
      "react",
      "next.js",
      "kubernetes",
    ],
  },
  {
    species: "leaf_axolotl",
    keywords: [
      "bio",
      "biology",
      "cell",
      "cells",
      "dna",
      "rna",
      "gene",
      "genes",
      "genetics",
      "genetic",
      "protein",
      "proteins",
      "enzyme",
      "anatomy",
      "physiology",
      "medical",
      "medicine",
      "krebs",
      "evolution",
      "ecology",
      "organism",
      "neuroscience",
      "neuron",
      "neurons",
      "brain",
      "chem",
      "chemistry",
      "molecule",
      "molecules",
      "reaction",
      "reactions",
    ],
  },
  {
    species: "quill_owl",
    keywords: [
      "history",
      "war",
      "empire",
      "philosophy",
      "philosophical",
      "philosopher",
      "literature",
      "novel",
      "poet",
      "poetry",
      "ancient",
      "medieval",
      "renaissance",
      "ethics",
      "politics",
      "stoic",
      "stoicism",
      "kant",
      "shakespeare",
      "homer",
    ],
  },
  {
    species: "star_octopus",
    keywords: [
      "physics",
      "physical",
      "mechanics",
      "thermodynamics",
      "electromagnetism",
      "quantum",
      "relativity",
      "astronomy",
      "astrophysics",
      "planet",
      "planets",
      "stellar",
      "galaxy",
      "cosmology",
      "cosmological",
      "cosmic",
      "particle",
      "supernova",
      "blackhole",
      "black hole",
    ],
  },
  {
    species: "crystal_bunny",
    keywords: [
      "art",
      "music",
      "musical",
      "composition",
      "paint",
      "painting",
      "drawing",
      "design",
      "color",
      "harmony",
      "melody",
      "rhythm",
      "sculpture",
      "architecture",
      "fashion",
      "photography",
    ],
  },
  {
    species: "babel_cat",
    keywords: [
      "language",
      "languages",
      "grammar",
      "syntax",
      "mandarin",
      "chinese",
      "japanese",
      "spanish",
      "french",
      "german",
      "italian",
      "korean",
      "arabic",
      "russian",
      "linguistic",
      "linguistics",
      "translation",
      "translate",
      "vocabulary",
      "kanji",
      "hanzi",
      "phonetic",
      "phonetics",
    ],
  },
];

/**
 * Classify a deck topic into a pet species. First-match-wins on whole-word
 * keyword (case-insensitive). Multi-word keywords match as substrings.
 * Returns "pip" (default slime) when nothing matches.
 */
export function categorizeTopic(topic: string): PetSpecies {
  const t = topic.toLowerCase();
  const tokens = new Set(t.split(/[^a-z0-9]+/i).filter(Boolean));
  for (const rule of RULES) {
    for (const k of rule.keywords) {
      if (k.includes(" ") ? t.includes(k) : tokens.has(k)) {
        return rule.species;
      }
    }
  }
  return "pip";
}

/**
 * Pick the dominant species from a topic tally. Ties are broken by the
 * order in which species first appeared in the tally — caller controls
 * that via insertion order. Returns "pip" if the tally is empty.
 */
export function dominantSpecies(
  tally: Record<string, number>,
): PetSpecies {
  let best: PetSpecies = "pip";
  let bestCount = -1;
  for (const [k, v] of Object.entries(tally)) {
    if (v > bestCount) {
      best = k as PetSpecies;
      bestCount = v;
    }
  }
  return bestCount > 0 ? best : "pip";
}
