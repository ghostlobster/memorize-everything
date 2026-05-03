import { describe, expect, it } from "vitest";
import { isLeech, leechThreshold } from "./leech";
import type { Grade } from "@/lib/db/schema";

const W: Grade = "wrong";
const R: Grade = "right";
const H: Grade = "hard";

describe("isLeech", () => {
  it("returns false when fewer reviews than threshold", () => {
    expect(isLeech([W, W, W], 4)).toBe(false);
  });

  it("returns true when exactly threshold consecutive wrongs (newest-first)", () => {
    expect(isLeech([W, W, W, W], 4)).toBe(true);
  });

  it("returns true when more than threshold reviews and first N are all wrong", () => {
    expect(isLeech([W, W, W, W, R, R], 4)).toBe(true);
  });

  it("returns false when non-wrong grade breaks the streak within threshold", () => {
    expect(isLeech([W, W, R, W], 4)).toBe(false);
  });

  it("returns false when hard grade breaks the streak", () => {
    expect(isLeech([W, W, H, W], 4)).toBe(false);
  });

  it("returns false when all right", () => {
    expect(isLeech([R, R, R, R], 4)).toBe(false);
  });

  it("threshold of 1: single wrong is a leech", () => {
    expect(isLeech([W], 1)).toBe(true);
    expect(isLeech([R], 1)).toBe(false);
  });

  it("threshold of 2: two consecutive wrongs", () => {
    expect(isLeech([W, W], 2)).toBe(true);
    expect(isLeech([W, R], 2)).toBe(false);
  });

  it("empty grades are never a leech", () => {
    expect(isLeech([], 4)).toBe(false);
  });
});

describe("leechThreshold", () => {
  it("defaults to 4 when env var is absent", () => {
    const orig = process.env.LEECH_THRESHOLD;
    delete process.env.LEECH_THRESHOLD;
    expect(leechThreshold()).toBe(4);
    if (orig !== undefined) process.env.LEECH_THRESHOLD = orig;
  });

  it("parses a valid positive integer from env", () => {
    const orig = process.env.LEECH_THRESHOLD;
    process.env.LEECH_THRESHOLD = "6";
    expect(leechThreshold()).toBe(6);
    if (orig !== undefined) process.env.LEECH_THRESHOLD = orig;
    else delete process.env.LEECH_THRESHOLD;
  });

  it("falls back to 4 for non-numeric env value", () => {
    const orig = process.env.LEECH_THRESHOLD;
    process.env.LEECH_THRESHOLD = "banana";
    expect(leechThreshold()).toBe(4);
    if (orig !== undefined) process.env.LEECH_THRESHOLD = orig;
    else delete process.env.LEECH_THRESHOLD;
  });
});
