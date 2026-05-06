"use client";

import type { PetSpecies, PetMood } from "@/lib/db/schema";

interface PetSvgProps {
  species: PetSpecies;
  stage: number; // 1..5
  mood: PetMood;
  size?: number;
  className?: string;
}

/**
 * Tiny stylised SVG critter. Body shape varies by species; the number of
 * accessory shapes (ears, spikes, halos) scales with stage. Mood swaps
 * the eye + mouth glyph.
 */
export function PetSvg({ species, stage, mood, size = 80, className }: PetSvgProps) {
  const palette = PALETTES[species];
  const eyes = MOODS[mood].eyes;
  const mouth = MOODS[mood].mouth;
  const accessoryCount = Math.max(0, stage - 1); // stage 1 → 0 accessories

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${species} pet at stage ${stage}, ${mood}`}
    >
      <defs>
        <radialGradient id={`pet-grad-${species}`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor={palette.highlight} />
          <stop offset="60%" stopColor={palette.body} />
          <stop offset="100%" stopColor={palette.shadow} />
        </radialGradient>
      </defs>
      <BodyShape species={species} fill={`url(#pet-grad-${species})`} stroke={palette.shadow} />
      <Accessories count={accessoryCount} palette={palette} />
      <g transform="translate(50 52)">
        {eyes}
        {mouth}
      </g>
    </svg>
  );
}

interface Palette {
  body: string;
  highlight: string;
  shadow: string;
  accent: string;
}

const PALETTES: Record<PetSpecies, Palette> = {
  pip: {
    body: "#6ee7b7",
    highlight: "#bbf7d0",
    shadow: "#10b981",
    accent: "#065f46",
  },
  cyber_fox: {
    body: "#38bdf8",
    highlight: "#7dd3fc",
    shadow: "#0369a1",
    accent: "#1e40af",
  },
  leaf_axolotl: {
    body: "#34d399",
    highlight: "#a7f3d0",
    shadow: "#047857",
    accent: "#fb7185",
  },
  quill_owl: {
    body: "#fbbf24",
    highlight: "#fde68a",
    shadow: "#92400e",
    accent: "#7c2d12",
  },
  star_octopus: {
    body: "#a78bfa",
    highlight: "#ddd6fe",
    shadow: "#5b21b6",
    accent: "#fef08a",
  },
  crystal_bunny: {
    body: "#f472b6",
    highlight: "#fbcfe8",
    shadow: "#be185d",
    accent: "#a78bfa",
  },
  babel_cat: {
    body: "#fb923c",
    highlight: "#fed7aa",
    shadow: "#9a3412",
    accent: "#3b82f6",
  },
};

function BodyShape({
  species,
  fill,
  stroke,
}: {
  species: PetSpecies;
  fill: string;
  stroke: string;
}) {
  switch (species) {
    case "leaf_axolotl":
      return (
        <ellipse cx="50" cy="55" rx="34" ry="28" fill={fill} stroke={stroke} strokeWidth="1.5" />
      );
    case "cyber_fox":
      return (
        <path
          d="M20 60 Q20 30 50 28 Q80 30 80 60 Q80 80 50 80 Q20 80 20 60 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
      );
    case "star_octopus":
      return (
        <g>
          <circle cx="50" cy="48" r="28" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path
            d="M28 70 Q22 88 30 86 M40 76 Q40 92 48 88 M52 76 Q52 92 60 88 M70 70 Q78 88 70 86"
            stroke={stroke}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "quill_owl":
      return (
        <path
          d="M50 22 C24 22 18 50 22 70 C26 88 50 90 50 90 C50 90 74 88 78 70 C82 50 76 22 50 22 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
      );
    case "crystal_bunny":
      return (
        <g>
          <ellipse cx="50" cy="58" rx="30" ry="26" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M38 30 L42 14 L46 32 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <path d="M62 30 L58 14 L54 32 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
        </g>
      );
    case "babel_cat":
      return (
        <g>
          <path
            d="M22 60 Q22 36 50 32 Q78 36 78 60 Q78 82 50 82 Q22 82 22 60 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path d="M28 36 L34 22 L40 38 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <path d="M72 36 L66 22 L60 38 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
        </g>
      );
    case "pip":
    default:
      return (
        <path
          d="M22 70 Q22 36 50 32 Q78 36 78 70 Q78 84 50 84 Q22 84 22 70 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
      );
  }
}

function Accessories({
  count,
  palette,
}: {
  count: number;
  palette: Palette;
}) {
  if (count <= 0) return null;
  const items = [];
  if (count >= 1) {
    items.push(
      <circle
        key="aura"
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke={palette.accent}
        strokeWidth="0.6"
        strokeDasharray="2 3"
        opacity="0.55"
      />,
    );
  }
  if (count >= 2) {
    items.push(
      <g key="sparkles" opacity="0.85">
        <path d="M14 20 l2 2 l-2 2 l-2 -2 z" fill={palette.accent} />
        <path d="M86 14 l2 2 l-2 2 l-2 -2 z" fill={palette.accent} />
        <path d="M82 78 l2 2 l-2 2 l-2 -2 z" fill={palette.accent} />
      </g>,
    );
  }
  if (count >= 3) {
    items.push(
      <path
        key="crown"
        d="M36 24 L42 16 L50 24 L58 16 L64 24 L60 30 L40 30 Z"
        fill={palette.accent}
        stroke={palette.shadow}
        strokeWidth="1"
      />,
    );
  }
  if (count >= 4) {
    items.push(
      <g key="halo">
        <ellipse
          cx="50"
          cy="14"
          rx="20"
          ry="4"
          fill="none"
          stroke={palette.accent}
          strokeWidth="2"
        />
      </g>,
    );
  }
  return <g>{items}</g>;
}

const MOODS: Record<PetMood, { eyes: React.ReactNode; mouth: React.ReactNode }> = {
  happy: {
    eyes: (
      <g>
        <path d="M-12 -4 q4 -6 8 0" stroke="#0f172a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M4 -4 q4 -6 8 0" stroke="#0f172a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
    ),
    mouth: (
      <path
        d="M-7 8 q7 6 14 0"
        stroke="#0f172a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    ),
  },
  neutral: {
    eyes: (
      <g>
        <circle cx="-8" cy="-3" r="2.4" fill="#0f172a" />
        <circle cx="8" cy="-3" r="2.4" fill="#0f172a" />
      </g>
    ),
    mouth: (
      <path d="M-5 9 h10" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
    ),
  },
  tired: {
    eyes: (
      <g>
        <path d="M-12 -2 h8" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M4 -2 h8" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    ),
    mouth: (
      <path
        d="M-6 10 q6 -4 12 0"
        stroke="#0f172a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    ),
  },
};
