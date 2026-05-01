"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  SkipForward,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  analogyCardAction,
  gradeCardAction,
  primeCardAction,
} from "@/server/actions/decks";
import type { Grade } from "@/lib/db/schema";

export interface ReviewCard {
  id: string;
  front: string;
  back: string;
  whyItMatters: string | null;
  referenceSection: string | null;
  repetition: number;
  ease: number;
  deckTopic?: string; // populated in multi-deck sessions
}

// Flow:
//   front  → user attempts recall, reveals back
//   back   → user grades. Right/Hard → advance. Wrong → priming.
//   priming→ user tries again from the new angle; can reveal answer (→ revealed)
//            or request analogy (→ analogy).
//   revealed / analogy → user clicks Next.
type Phase = "front" | "back" | "priming" | "revealed" | "analogy";

export function ReviewSession({
  deckId,
  deckTopic,
  initialQueue,
  exitHref,
}: {
  deckId: string;
  deckTopic: string;
  initialQueue: ReviewCard[];
  exitHref?: string;
}) {
  const router = useRouter();

  // Queue state — all advancement is client-side
  const [queue, setQueue] = useState<ReviewCard[]>(initialQueue);
  const [queueIdx, setQueueIdx] = useState(0);
  const [reReviewCounts, setReReviewCounts] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState(() => Date.now());

  const currentCard = queue[queueIdx];
  const originalDue = initialQueue.length;
  const isReReview = (reReviewCounts[currentCard?.id] ?? 0) > 0;
  const reReviewPending = queue
    .slice(queueIdx + 1)
    .filter((c) => (reReviewCounts[c.id] ?? 0) > 0).length;

  const [phase, setPhase] = useState<Phase>("front");
  const [primingQuestion, setPrimingQuestion] = useState<string | null>(null);
  const [analogy, setAnalogy] = useState<string | null>(null);
  const [primingLoading, setPrimingLoading] = useState(false);
  const [analogyLoading, setAnalogyLoading] = useState(false);
  const [lastInterval, setLastInterval] = useState<number | null>(null);

  const resetCardState = useCallback(() => {
    setPhase("front");
    setPrimingQuestion(null);
    setAnalogy(null);
    setLastInterval(null);
  }, []);

  const advance = useCallback(() => {
    const nextIdx = queueIdx + 1;
    if (nextIdx >= queue.length) {
      router.push(exitHref ?? `/decks/${deckId}`);
      return;
    }
    setQueueIdx(nextIdx);
    setStartTime(Date.now());
    resetCardState();
  }, [queueIdx, queue.length, deckId, exitHref, router, resetCardState]);

  const handleGrade = useCallback(
    async (grade: Grade) => {
      const durationMs = Date.now() - startTime;
      const result = await gradeCardAction({
        cardId: currentCard.id,
        grade,
        durationMs,
      });
      setLastInterval(result.intervalDays);

      if (grade === "wrong") {
        // Re-queue once per card per session (max 2 times)
        const reCount = reReviewCounts[currentCard.id] ?? 0;
        if (reCount < 2) {
          setQueue((q) => [...q, currentCard]);
          setReReviewCounts((prev) => ({
            ...prev,
            [currentCard.id]: reCount + 1,
          }));
        }
        setPrimingLoading(true);
        try {
          const r = await primeCardAction(currentCard.id);
          setPrimingQuestion(r.question);
          setPhase("priming");
        } finally {
          setPrimingLoading(false);
        }
      } else {
        advance();
      }
    },
    [currentCard, advance, startTime, reReviewCounts],
  );

  const requestAnalogy = useCallback(async () => {
    setAnalogyLoading(true);
    try {
      const r = await analogyCardAction(currentCard.id);
      setAnalogy(r.analogy);
      setPhase("analogy");
    } finally {
      setAnalogyLoading(false);
    }
  }, [currentCard.id]);

  // Keyboard shortcuts: space = flip, 1/2/3 = grade, n = next
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (phase === "front" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setPhase("back");
      } else if (phase === "back") {
        if (e.key === "1") handleGrade("wrong");
        else if (e.key === "2") handleGrade("hard");
        else if (e.key === "3") handleGrade("right");
      } else if (
        (phase === "priming" || phase === "revealed" || phase === "analogy") &&
        e.key === "n"
      ) {
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleGrade, advance]);

  const showBackContent =
    phase === "back" || phase === "revealed" || phase === "analogy";

  const dueRemaining = originalDue - Math.min(queueIdx, originalDue);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between text-sm">
        <Link
          href={`/decks/${deckId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {currentCard.deckTopic ?? deckTopic}
        </Link>
        <div className="flex items-center gap-2 text-muted-foreground">
          {isReReview ? (
            <Badge variant="warning">
              Re-check · {reReviewPending + 1} remaining
            </Badge>
          ) : (
            <Badge variant="secondary">
              {dueRemaining} due
              {reReviewPending > 0 && ` · ${reReviewPending} re-check`}
            </Badge>
          )}
          <span className="font-mono">
            rep {currentCard.repetition} · ease {currentCard.ease.toFixed(2)}
          </span>
        </div>
      </header>

      {isReReview && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Re-check — you missed this one earlier
        </div>
      )}

      <Card className="min-h-[280px]">
        <CardHeader>
          <CardDescription className="flex items-center justify-between">
            <span>
              {phase === "front" && "Front — try to recall"}
              {phase === "back" && "Back — how did you do?"}
              {phase === "priming" && "Priming question — try again"}
              {phase === "revealed" && "Answer revealed"}
              {phase === "analogy" && "Deeper model"}
            </span>
            {currentCard.referenceSection && (
              <Badge variant="outline" className="font-mono">
                {currentCard.referenceSection}
              </Badge>
            )}
          </CardDescription>
          <CardTitle className="text-xl leading-snug">
            {currentCard.front}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          {showBackContent && (
            <>
              <p className="whitespace-pre-wrap text-base">
                {currentCard.back}
              </p>
              {currentCard.whyItMatters && (
                <p className="text-muted-foreground">
                  {currentCard.whyItMatters}
                </p>
              )}
            </>
          )}

          {(phase === "priming" ||
            phase === "revealed" ||
            phase === "analogy") &&
            primingQuestion && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-warning">
                  <Zap className="h-3.5 w-3.5" /> Priming question
                </div>
                <p className="whitespace-pre-wrap text-base">
                  {primingQuestion}
                </p>
              </div>
            )}

          {phase === "analogy" && analogy && (
            <div className="rounded-md border border-primary/40 bg-primary/10 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Mental model
              </div>
              <p className="whitespace-pre-wrap">{analogy}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {phase === "front" && (
          <Button onClick={() => setPhase("back")} className="w-full" size="lg">
            Show answer <kbd className="ml-2 text-xs opacity-70">space</kbd>
          </Button>
        )}

        {phase === "back" && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="destructive"
              onClick={() => handleGrade("wrong")}
              disabled={primingLoading}
              size="lg"
            >
              <ThumbsDown className="h-4 w-4" />
              Wrong <kbd className="ml-1 text-xs opacity-70">1</kbd>
            </Button>
            <Button
              variant="warning"
              onClick={() => handleGrade("hard")}
              size="lg"
            >
              <RotateCcw className="h-4 w-4" />
              Hard <kbd className="ml-1 text-xs opacity-70">2</kbd>
            </Button>
            <Button
              variant="success"
              onClick={() => handleGrade("right")}
              size="lg"
            >
              <ThumbsUp className="h-4 w-4" />
              Right <kbd className="ml-1 text-xs opacity-70">3</kbd>
            </Button>
          </div>
        )}

        {phase === "priming" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setPhase("revealed")}
              variant="outline"
              className="flex-1"
            >
              Show the answer
            </Button>
            <Button
              onClick={requestAnalogy}
              disabled={analogyLoading}
              className="flex-1"
            >
              {analogyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Give me an analogy
                </>
              )}
            </Button>
          </div>
        )}

        {phase === "revealed" && (
          <Button
            onClick={requestAnalogy}
            variant="outline"
            className="w-full"
            disabled={analogyLoading}
          >
            {analogyLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Give me an analogy
          </Button>
        )}

        {(phase === "priming" ||
          phase === "revealed" ||
          phase === "analogy") &&
          lastInterval != null && (
            <Button
              onClick={advance}
              variant="secondary"
              className="w-full"
            >
              <SkipForward className="h-4 w-4" />
              Next card <kbd className="ml-1 text-xs opacity-70">n</kbd>
              <span className="ml-3 text-xs text-muted-foreground">
                next review in {lastInterval}d
              </span>
            </Button>
          )}

        {phase === "back" && primingLoading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Preparing a priming
            question…
          </p>
        )}
      </div>
    </div>
  );
}
