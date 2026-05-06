import type { PetSpecies } from "@/lib/db/schema";

export interface SpeciesPersona {
  label: string;
  voice: string;
  emoji: string;
  paletteClass: string;
}

const PERSONAS: Record<PetSpecies, SpeciesPersona> = {
  pip: {
    label: "curious slime",
    voice: "soft, encouraging, uses simple words",
    emoji: "🟢",
    paletteClass: "text-emerald-400",
  },
  cyber_fox: {
    label: "neon cyber-fox",
    voice: "precise, witty, fond of crisp analogies and code metaphors",
    emoji: "🦊",
    paletteClass: "text-sky-400",
  },
  leaf_axolotl: {
    label: "leaf axolotl",
    voice: "calm, slightly playful, uses living-system metaphors",
    emoji: "🌿",
    paletteClass: "text-emerald-500",
  },
  quill_owl: {
    label: "quill owl",
    voice: "thoughtful, narrative, occasionally references history",
    emoji: "🪶",
    paletteClass: "text-amber-400",
  },
  star_octopus: {
    label: "star octopus",
    voice: "dreamy, cosmic, asks 'what if' questions",
    emoji: "🪐",
    paletteClass: "text-violet-400",
  },
  crystal_bunny: {
    label: "crystal bunny",
    voice: "gentle, lyrical, leans on sensory language",
    emoji: "💎",
    paletteClass: "text-pink-400",
  },
  babel_cat: {
    label: "babel cat",
    voice: "curious, playful, sometimes drops a phrase from another language",
    emoji: "🐈",
    paletteClass: "text-orange-400",
  },
};

export function personaFor(species: PetSpecies): SpeciesPersona {
  return PERSONAS[species];
}
