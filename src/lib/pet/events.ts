/**
 * Typed CustomEvent helpers for pet UI reactions. Both buses run on
 * `window` so any client component anywhere in the tree can dispatch.
 */

export type PetReactKind =
  | "correct"
  | "hard"
  | "wrong"
  | "levelup"
  | "evolve"
  | "celebrate"
  | "speak";

export interface PetReactDetail {
  kind: PetReactKind;
  xpDelta?: number;
  level?: number;
  stage?: number;
  message?: string;
}

export type PetAttentionKind =
  | "chase"
  | "nuzzle"
  | "dizzy"
  | "focused"
  | "curious"
  | "nap"
  | "wakeup"
  | "peek"
  | "follow"
  | "idle"
  | "wander";

export interface PetAttentionDetail {
  kind: PetAttentionKind;
  cursorX?: number;
  cursorY?: number;
}

export const PET_REACT_EVENT = "pet:react";
export const PET_ATTENTION_EVENT = "pet:attention";

export function dispatchPetReact(detail: PetReactDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PetReactDetail>(PET_REACT_EVENT, { detail }),
  );
}

export function dispatchPetAttention(detail: PetAttentionDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PetAttentionDetail>(PET_ATTENTION_EVENT, { detail }),
  );
}

export function onPetReact(
  handler: (detail: PetReactDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const fn = (e: Event) => {
    const ce = e as CustomEvent<PetReactDetail>;
    handler(ce.detail);
  };
  window.addEventListener(PET_REACT_EVENT, fn);
  return () => window.removeEventListener(PET_REACT_EVENT, fn);
}

export function onPetAttention(
  handler: (detail: PetAttentionDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const fn = (e: Event) => {
    const ce = e as CustomEvent<PetAttentionDetail>;
    handler(ce.detail);
  };
  window.addEventListener(PET_ATTENTION_EVENT, fn);
  return () => window.removeEventListener(PET_ATTENTION_EVENT, fn);
}
