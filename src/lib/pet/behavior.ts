import type { PetAttentionKind } from "./events";
import type { PetPosition } from "@/lib/db/schema";

export type RNG = () => number;

const ANIMATION_POOL: Record<PetAttentionKind, readonly string[]> = {
  chase: ["pet-anim-chase-1", "pet-anim-chase-2"],
  nuzzle: ["pet-anim-nuzzle-1", "pet-anim-nuzzle-2"],
  dizzy: ["pet-anim-dizzy-1", "pet-anim-dizzy-2"],
  focused: ["pet-anim-focused-1"],
  curious: ["pet-anim-curious-1", "pet-anim-curious-2"],
  nap: ["pet-anim-nap-1"],
  wakeup: ["pet-anim-wakeup-1"],
  peek: ["pet-anim-peek-1", "pet-anim-peek-2"],
  follow: ["pet-anim-follow-1"],
  idle: ["pet-anim-idle-look-1", "pet-anim-idle-look-2"],
  wander: ["pet-anim-wander-1"],
};

export const ATTENTION_COOLDOWN_MS: Record<PetAttentionKind, number> = {
  chase: 800,
  nuzzle: 4_000,
  dizzy: 6_000,
  focused: 10_000,
  curious: 30_000,
  nap: 60_000,
  wakeup: 60_000,
  peek: 5_000,
  follow: 1_500,
  idle: 90_000,
  wander: 240_000,
};

export interface PickAttentionResult {
  variant: string;
  durationMs: number;
}

/**
 * Pick a CSS animation class for the given attention kind, avoiding an
 * immediate repeat of `prevVariant` when the pool has more than one
 * option. Pure given an injected RNG.
 */
export function pickAttentionAnimation(
  kind: PetAttentionKind,
  prevVariant: string | null,
  rng: RNG = Math.random,
): PickAttentionResult {
  const pool = ANIMATION_POOL[kind];
  let variant = pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
  if (pool.length > 1 && variant === prevVariant) {
    const idx = pool.indexOf(variant);
    variant = pool[(idx + 1) % pool.length]!;
  }
  return { variant, durationMs: durationFor(kind) };
}

function durationFor(kind: PetAttentionKind): number {
  switch (kind) {
    case "chase":
    case "follow":
    case "peek":
      return 600;
    case "nuzzle":
      return 1_200;
    case "dizzy":
      return 1_400;
    case "focused":
      return 2_000;
    case "curious":
      return 2_400;
    case "idle":
      return 2_400;
    case "wakeup":
      return 1_500;
    case "nap":
      return 4_000;
    case "wander":
      return 1_200;
    default:
      return 1_000;
  }
}

export interface CooldownMap {
  [k: string]: number;
}

/**
 * True if the given kind is currently cooling down. `now` and `lastFired`
 * are millisecond timestamps; pure for testability.
 */
export function isOnCooldown(
  kind: PetAttentionKind,
  lastFired: CooldownMap,
  now: number,
): boolean {
  const last = lastFired[kind];
  if (last == null) return false;
  return now - last < ATTENTION_COOLDOWN_MS[kind];
}

export interface Viewport {
  width: number;
  height: number;
}

const ANCHORS: readonly PetPosition["anchor"][] = ["br", "bl", "tr", "tl"];

/**
 * Pick a fresh wander target — different anchor than the current one,
 * with a small random offset. Deterministic with a seeded RNG.
 */
export function computeWanderTarget(
  current: PetPosition,
  rng: RNG = Math.random,
): PetPosition {
  const others = ANCHORS.filter((a) => a !== current.anchor);
  const anchor = others[Math.floor(rng() * others.length)] ?? "br";
  const offsetX = 16 + Math.floor(rng() * 80);
  const offsetY = 16 + Math.floor(rng() * 80);
  return { anchor, offsetX, offsetY };
}

/**
 * Convert a (anchor, offset) position into pixel coordinates for a
 * fixed-position pet of the given size. Clamps so the pet always stays
 * fully on-screen.
 */
export function anchorToPixels(
  pos: PetPosition,
  petSize: number,
  vp: Viewport,
): { left: number; top: number } {
  const maxLeft = Math.max(0, vp.width - petSize);
  const maxTop = Math.max(0, vp.height - petSize);
  const ox = Math.max(0, Math.min(pos.offsetX, maxLeft));
  const oy = Math.max(0, Math.min(pos.offsetY, maxTop));
  let left: number;
  let top: number;
  switch (pos.anchor) {
    case "br":
      left = vp.width - petSize - ox;
      top = vp.height - petSize - oy;
      break;
    case "bl":
      left = ox;
      top = vp.height - petSize - oy;
      break;
    case "tr":
      left = vp.width - petSize - ox;
      top = oy;
      break;
    case "tl":
      left = ox;
      top = oy;
      break;
  }
  return {
    left: Math.max(0, Math.min(left, maxLeft)),
    top: Math.max(0, Math.min(top, maxTop)),
  };
}

/**
 * Convert raw pixel coordinates back into the nearest corner anchor
 * with offset. Used after a drag-and-drop.
 */
export function pixelsToAnchor(
  px: { left: number; top: number },
  petSize: number,
  vp: Viewport,
): PetPosition {
  const distances: Array<{ a: PetPosition["anchor"]; d: number }> = [
    {
      a: "tl",
      d: Math.hypot(px.left, px.top),
    },
    {
      a: "tr",
      d: Math.hypot(vp.width - petSize - px.left, px.top),
    },
    {
      a: "bl",
      d: Math.hypot(px.left, vp.height - petSize - px.top),
    },
    {
      a: "br",
      d: Math.hypot(
        vp.width - petSize - px.left,
        vp.height - petSize - px.top,
      ),
    },
  ];
  distances.sort((a, b) => a.d - b.d);
  const anchor = distances[0]!.a;
  let offsetX = 0;
  let offsetY = 0;
  switch (anchor) {
    case "tl":
      offsetX = px.left;
      offsetY = px.top;
      break;
    case "tr":
      offsetX = vp.width - petSize - px.left;
      offsetY = px.top;
      break;
    case "bl":
      offsetX = px.left;
      offsetY = vp.height - petSize - px.top;
      break;
    case "br":
      offsetX = vp.width - petSize - px.left;
      offsetY = vp.height - petSize - px.top;
      break;
  }
  return {
    anchor,
    offsetX: Math.max(0, Math.round(offsetX)),
    offsetY: Math.max(0, Math.round(offsetY)),
  };
}

export function clampToViewport(
  pos: PetPosition,
  petSize: number,
  vp: Viewport,
): PetPosition {
  const px = anchorToPixels(pos, petSize, vp);
  return pixelsToAnchor(px, petSize, vp);
}

/** Deterministic mulberry32 seeded RNG, useful in tests. */
export function seededRng(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
