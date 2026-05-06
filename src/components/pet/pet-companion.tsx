"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PetSvg } from "./pet-svg";
import { PetActivity } from "./pet-activity";
import { PetChatPanel } from "./pet-chat-panel";
import {
  anchorToPixels,
  computeWanderTarget,
  pickAttentionAnimation,
  pixelsToAnchor,
} from "@/lib/pet/behavior";
import {
  onPetAttention,
  onPetReact,
  type PetAttentionDetail,
  type PetReactDetail,
} from "@/lib/pet/events";
import type { Pet, PetMood, PetPosition } from "@/lib/db/schema";
import { updatePetPositionAction } from "@/server/actions/pets";

const PET_SIZE = 80;
const REACT_DURATION_MS = 1_400;

interface InitialChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function PetCompanion({
  pet,
  initialMessages,
}: {
  pet: Pet;
  initialMessages: InitialChatMessage[];
}) {
  const [position, setPosition] = useState<PetPosition>(pet.position);
  const [pixels, setPixels] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });
  const [animClass, setAnimClass] = useState<string | null>(null);
  const [mood, setMood] = useState<PetMood>(pet.mood);
  const [bubble, setBubble] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [xpFloater, setXpFloater] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const lastVariantRef = useRef<string | null>(null);
  const animTimeoutRef = useRef<number | null>(null);
  const persistTimeoutRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  const runAnim = useCallback((cls: string, durationMs: number) => {
    if (reducedMotionRef.current) {
      setAnimClass("pet-anim-fade");
      if (animTimeoutRef.current) window.clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = window.setTimeout(
        () => setAnimClass(null),
        200,
      );
      return;
    }
    setAnimClass(cls);
    lastVariantRef.current = cls;
    if (animTimeoutRef.current) window.clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = window.setTimeout(
      () => setAnimClass(null),
      durationMs,
    );
  }, []);

  const triggerWander = useCallback(() => {
    setPosition((prev) => {
      const next = computeWanderTarget(prev);
      setTransitioning(true);
      window.setTimeout(() => setTransitioning(false), 1_200);
      return next;
    });
  }, []);

  // Keep pet inside the viewport when window resizes.
  useEffect(() => {
    const update = () => {
      const vp = { width: window.innerWidth, height: window.innerHeight };
      setPixels(anchorToPixels(position, PET_SIZE, vp));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [position]);

  // Cache reduced-motion preference.
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = m.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  // Quiz fetch on mount, after a 30s settling delay.
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/pet/quiz");
        if (!res.ok) return;
        const json = (await res.json()) as { question: string | null };
        if (cancelled || !json.question) return;
        setBubble(json.question);
        setPendingQuestion(json.question);
        runAnim("pet-anim-speak", 3_000);
      } catch {
        /* non-fatal */
      }
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [runAnim]);

  // Listen for review-time pet:react events.
  useEffect(() => {
    return onPetReact((detail: PetReactDetail) => {
      switch (detail.kind) {
        case "correct":
          setMood("happy");
          runAnim("pet-anim-jump", REACT_DURATION_MS);
          if (detail.xpDelta && detail.xpDelta > 0) {
            setXpFloater(`+${detail.xpDelta} XP`);
            window.setTimeout(() => setXpFloater(null), 1_400);
          }
          break;
        case "hard":
          runAnim("pet-anim-tilt", REACT_DURATION_MS);
          if (detail.xpDelta && detail.xpDelta > 0) {
            setXpFloater(`+${detail.xpDelta} XP`);
            window.setTimeout(() => setXpFloater(null), 1_400);
          }
          break;
        case "wrong":
          setMood("tired");
          runAnim("pet-anim-sad", REACT_DURATION_MS);
          break;
        case "levelup":
          setMood("happy");
          runAnim("pet-anim-levelup", 2_400);
          setBubble(`level ${detail.level}!`);
          window.setTimeout(() => setBubble(null), 2_500);
          break;
        case "evolve":
          runAnim("pet-anim-evolve", 3_000);
          setBubble("evolved!");
          window.setTimeout(() => setBubble(null), 3_000);
          break;
        case "celebrate":
          setMood("happy");
          runAnim("pet-anim-jump", REACT_DURATION_MS);
          break;
        case "speak":
          if (detail.message) {
            setBubble(detail.message);
            window.setTimeout(() => setBubble(null), 4_000);
          }
          runAnim("pet-anim-speak", 1_400);
          break;
      }
    });
  }, [runAnim]);

  // Listen for ambient activity events.
  useEffect(() => {
    return onPetAttention((detail: PetAttentionDetail) => {
      const pick = pickAttentionAnimation(detail.kind, lastVariantRef.current);
      if (detail.kind === "wander") {
        triggerWander();
      } else if (detail.kind === "nap") {
        setMood("tired");
        runAnim(pick.variant, pick.durationMs);
      } else if (detail.kind === "wakeup") {
        setMood("neutral");
        runAnim(pick.variant, pick.durationMs);
      } else {
        runAnim(pick.variant, pick.durationMs);
      }
    });
  }, [runAnim, triggerWander]);

  const persistPosition = useCallback((next: PetPosition) => {
    if (persistTimeoutRef.current) window.clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = window.setTimeout(() => {
      void updatePetPositionAction(next).catch(() => undefined);
    }, 1_000);
    try {
      window.localStorage.setItem("pet:pos", JSON.stringify(next));
    } catch {
      /* private mode, ignore */
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (chatOpen) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    dragOffsetRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const left = e.clientX - dragOffsetRef.current.dx;
    const top = e.clientY - dragOffsetRef.current.dy;
    setPixels({ left, top });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    const vp = { width: window.innerWidth, height: window.innerHeight };
    const next = pixelsToAnchor(pixels, PET_SIZE, vp);
    setPosition(next);
    persistPosition(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setChatOpen(true);
      return;
    }
    const STEP = 16;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowUp") dy = -STEP;
    else if (e.key === "ArrowDown") dy = STEP;
    else if (e.key === "ArrowLeft") dx = -STEP;
    else if (e.key === "ArrowRight") dx = STEP;
    else return;
    e.preventDefault();
    const next = { left: pixels.left + dx, top: pixels.top + dy };
    setPixels(next);
    const vp = { width: window.innerWidth, height: window.innerHeight };
    const anchored = pixelsToAnchor(next, PET_SIZE, vp);
    setPosition(anchored);
    persistPosition(anchored);
  };

  const petBox = useMemo(
    () => ({ x: pixels.left, y: pixels.top, w: PET_SIZE, h: PET_SIZE }),
    [pixels.left, pixels.top],
  );

  return (
    <>
      <PetActivity petBox={petBox} />
      <div
        className="pointer-events-none fixed inset-0 z-30"
        aria-hidden={chatOpen ? undefined : false}
      >
        <div
          className={`pointer-events-auto absolute select-none ${
            transitioning && !dragging ? "transition-all duration-700 ease-out" : ""
          }`}
          style={{ left: pixels.left, top: pixels.top, width: PET_SIZE, height: PET_SIZE }}
          tabIndex={0}
          role="button"
          aria-label={`${pet.name}, your ${pet.species} pet`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
          onClick={() => setChatOpen((v) => !v)}
        >
          <div className={`pet-anim-bob ${animClass ?? ""} ${dragging ? "scale-110" : ""}`}>
            <PetSvg
              species={pet.species}
              stage={pet.stage}
              mood={mood}
              size={PET_SIZE}
              className="drop-shadow-lg"
            />
          </div>
          {bubble && (
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow">
              {bubble}
            </div>
          )}
          {xpFloater && (
            <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 animate-[pet-xp-float_1.4s_ease-out_forwards] text-sm font-semibold text-success">
              {xpFloater}
            </div>
          )}
        </div>

        {chatOpen && (
          <div
            className="pointer-events-auto absolute"
            style={{
              right: 16,
              bottom: 16,
              width: 360,
              maxWidth: "calc(100vw - 32px)",
              height: 480,
              maxHeight: "calc(100vh - 32px)",
            }}
          >
            <PetChatPanel
              pet={pet}
              initialMessages={initialMessages}
              initialQuestion={pendingQuestion}
              onClose={() => {
                setChatOpen(false);
                setPendingQuestion(null);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
