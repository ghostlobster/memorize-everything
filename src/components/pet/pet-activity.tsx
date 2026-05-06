"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  ATTENTION_COOLDOWN_MS,
  isOnCooldown,
  type CooldownMap,
} from "@/lib/pet/behavior";
import { dispatchPetAttention } from "@/lib/pet/events";
import type { PetAttentionKind } from "@/lib/pet/events";

interface ActivityRefs {
  cooldown: CooldownMap;
  lastActivityAt: number;
  scrollDeltaSinceTick: number;
  scrollLastY: number;
  scrollLastTick: number;
  keyBurstCount: number;
  keyBurstStart: number;
  cursorX: number;
  cursorY: number;
  cursorMoveLast: number;
  cursorRestStart: number;
  petBox?: { x: number; y: number; w: number; h: number };
}

/**
 * Passive listener: maps real browser activity to pet attention events.
 * Mounted once inside `PetCompanion`.
 */
export function PetActivity({
  petBox,
}: {
  petBox: { x: number; y: number; w: number; h: number } | null;
}) {
  const pathname = usePathname();
  // Initialise with 0 timestamps; the mount effect rewrites them with
  // a fresh Date.now() before any listeners run.
  const refs = useRef<ActivityRefs>({
    cooldown: {},
    lastActivityAt: 0,
    scrollDeltaSinceTick: 0,
    scrollLastY: 0,
    scrollLastTick: 0,
    keyBurstCount: 0,
    keyBurstStart: 0,
    cursorX: 0,
    cursorY: 0,
    cursorMoveLast: 0,
    cursorRestStart: 0,
  });

  // Keep latest petBox in the ref (used inside listeners that mounted once).
  useEffect(() => {
    if (petBox) refs.current.petBox = petBox;
  }, [petBox]);

  const fire = (kind: PetAttentionKind, extra?: { cursorX?: number; cursorY?: number }) => {
    const now = Date.now();
    if (isOnCooldown(kind, refs.current.cooldown, now)) return;
    refs.current.cooldown[kind] = now;
    refs.current.lastActivityAt = now;
    dispatchPetAttention({ kind, ...extra });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const startNow = Date.now();
    refs.current.lastActivityAt = startNow;
    refs.current.scrollLastTick = startNow;
    refs.current.keyBurstStart = startNow;
    refs.current.cursorMoveLast = startNow;
    refs.current.cursorRestStart = startNow;

    const onPointerMove = (e: PointerEvent) => {
      const now = Date.now();
      const dt = now - refs.current.cursorMoveLast;
      refs.current.cursorMoveLast = now;
      const dx = e.clientX - refs.current.cursorX;
      const dy = e.clientY - refs.current.cursorY;
      const dist = Math.hypot(dx, dy);
      refs.current.cursorX = e.clientX;
      refs.current.cursorY = e.clientY;
      refs.current.lastActivityAt = now;
      // Fast move → chase
      if (dt > 0 && dist / Math.max(dt, 1) > 1.4) {
        fire("chase", { cursorX: e.clientX, cursorY: e.clientY });
      }
      // Resting near pet → nuzzle
      const box = refs.current.petBox;
      if (box) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const near = Math.hypot(e.clientX - cx, e.clientY - cy) < 100;
        if (near) {
          if (now - refs.current.cursorRestStart > 1000) {
            fire("nuzzle");
            refs.current.cursorRestStart = now;
          }
        } else {
          refs.current.cursorRestStart = now;
        }
      }
    };

    const onScroll = () => {
      const y = window.scrollY;
      const now = Date.now();
      const elapsed = now - refs.current.scrollLastTick;
      refs.current.scrollDeltaSinceTick += Math.abs(y - refs.current.scrollLastY);
      refs.current.scrollLastY = y;
      if (elapsed > 800) {
        if (refs.current.scrollDeltaSinceTick > 600) fire("dizzy");
        refs.current.scrollDeltaSinceTick = 0;
        refs.current.scrollLastTick = now;
      }
      refs.current.lastActivityAt = now;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - refs.current.keyBurstStart > 5_000) {
        refs.current.keyBurstStart = now;
        refs.current.keyBurstCount = 0;
      }
      refs.current.keyBurstCount += 1;
      refs.current.lastActivityAt = now;
      if (refs.current.keyBurstCount >= 30) {
        fire("focused");
        refs.current.keyBurstCount = 0;
      }
      // Treat unmodified arrow keys when pet has focus elsewhere; ignore here.
      void e;
    };

    const onCopy = () => fire("curious");

    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        fire("nap");
      } else if (hiddenAt) {
        const away = Date.now() - hiddenAt;
        hiddenAt = null;
        if (away > 60_000) fire("wakeup");
        else fire("peek");
      }
    };

    const onFocus = () => fire("peek");

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("copy", onCopy);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    // Idle / wander timer
    const idleInterval = window.setInterval(() => {
      const now = Date.now();
      const since = now - refs.current.lastActivityAt;
      if (since > 5 * 60_000) {
        fire("wander");
        refs.current.lastActivityAt = now;
      } else if (since > 90_000) {
        fire("idle");
      }
    }, 30_000);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("copy", onCopy);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(idleInterval);
    };
  }, []);

  // Route changes → follow.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      const now = Date.now();
      if (
        !isOnCooldown(
          "follow",
          refs.current.cooldown,
          now,
        )
      ) {
        refs.current.cooldown.follow = now;
        dispatchPetAttention({ kind: "follow" });
      }
    }
  }, [pathname]);

  // Reference the cooldown table so unused-import lint doesn't strip it.
  void ATTENTION_COOLDOWN_MS;
  return null;
}
