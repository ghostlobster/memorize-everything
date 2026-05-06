import { describe, it, expect } from "vitest";
import {
  ATTENTION_COOLDOWN_MS,
  anchorToPixels,
  clampToViewport,
  computeWanderTarget,
  isOnCooldown,
  pickAttentionAnimation,
  pixelsToAnchor,
  seededRng,
} from "./behavior";

const VP = { width: 1024, height: 768 };
const SIZE = 80;

describe("pickAttentionAnimation", () => {
  it("returns a class from the kind's pool", () => {
    const r = pickAttentionAnimation("chase", null, seededRng(1));
    expect(r.variant).toMatch(/^pet-anim-chase-/);
    expect(r.durationMs).toBeGreaterThan(0);
  });

  it("avoids immediate repeats when the pool has > 1 entry", () => {
    const rng = seededRng(7);
    const first = pickAttentionAnimation("chase", null, rng);
    const second = pickAttentionAnimation("chase", first.variant, rng);
    expect(second.variant).not.toBe(first.variant);
  });

  it("single-entry pools always return that entry", () => {
    const r = pickAttentionAnimation("focused", "pet-anim-focused-1", seededRng(2));
    expect(r.variant).toBe("pet-anim-focused-1");
  });
});

describe("isOnCooldown", () => {
  it("respects per-kind cooldowns", () => {
    const last = { chase: 1_000 };
    expect(isOnCooldown("chase", last, 1_500)).toBe(true);
    expect(
      isOnCooldown("chase", last, 1_000 + ATTENTION_COOLDOWN_MS.chase + 1),
    ).toBe(false);
  });

  it("returns false when the kind has never fired", () => {
    expect(isOnCooldown("dizzy", {}, 9_999)).toBe(false);
  });
});

describe("computeWanderTarget", () => {
  it("picks a different anchor than the current one", () => {
    const rng = seededRng(42);
    const out = computeWanderTarget({ anchor: "br", offsetX: 24, offsetY: 24 }, rng);
    expect(out.anchor).not.toBe("br");
    expect(out.offsetX).toBeGreaterThanOrEqual(16);
    expect(out.offsetX).toBeLessThan(96);
  });

  it("is deterministic with a seeded RNG", () => {
    const a = computeWanderTarget({ anchor: "br", offsetX: 24, offsetY: 24 }, seededRng(1));
    const b = computeWanderTarget({ anchor: "br", offsetX: 24, offsetY: 24 }, seededRng(1));
    expect(a).toEqual(b);
  });
});

describe("anchorToPixels / pixelsToAnchor", () => {
  it("br anchor lands in the bottom-right quadrant", () => {
    const px = anchorToPixels(
      { anchor: "br", offsetX: 24, offsetY: 24 },
      SIZE,
      VP,
    );
    expect(px.left).toBe(VP.width - SIZE - 24);
    expect(px.top).toBe(VP.height - SIZE - 24);
  });

  it("tl anchor lands in the top-left quadrant", () => {
    const px = anchorToPixels(
      { anchor: "tl", offsetX: 24, offsetY: 24 },
      SIZE,
      VP,
    );
    expect(px.left).toBe(24);
    expect(px.top).toBe(24);
  });

  it("clamps when offsets exceed the viewport", () => {
    const px = anchorToPixels(
      { anchor: "tl", offsetX: 99_999, offsetY: 99_999 },
      SIZE,
      VP,
    );
    expect(px.left).toBeLessThanOrEqual(VP.width - SIZE);
    expect(px.top).toBeLessThanOrEqual(VP.height - SIZE);
  });

  it("pixelsToAnchor finds the nearest corner", () => {
    expect(pixelsToAnchor({ left: 4, top: 4 }, SIZE, VP).anchor).toBe("tl");
    expect(pixelsToAnchor({ left: VP.width - 4, top: 4 }, SIZE, VP).anchor)
      .toBe("tr");
    expect(
      pixelsToAnchor(
        { left: VP.width - 100, top: VP.height - 100 },
        SIZE,
        VP,
      ).anchor,
    ).toBe("br");
  });

  it("round-trips a position through anchor → pixels → anchor", () => {
    const start = { anchor: "tr" as const, offsetX: 32, offsetY: 64 };
    const px = anchorToPixels(start, SIZE, VP);
    const back = pixelsToAnchor(px, SIZE, VP);
    expect(back.anchor).toBe(start.anchor);
    expect(back.offsetX).toBe(start.offsetX);
    expect(back.offsetY).toBe(start.offsetY);
  });

  it("clampToViewport survives a degenerate small window", () => {
    const tiny = { width: 100, height: 100 };
    const out = clampToViewport(
      { anchor: "br", offsetX: 999, offsetY: 999 },
      80,
      tiny,
    );
    const px = anchorToPixels(out, 80, tiny);
    expect(px.left).toBeGreaterThanOrEqual(0);
    expect(px.top).toBeGreaterThanOrEqual(0);
    expect(px.left + 80).toBeLessThanOrEqual(tiny.width);
    expect(px.top + 80).toBeLessThanOrEqual(tiny.height);
  });
});
