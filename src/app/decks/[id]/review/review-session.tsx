"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  PenLine,
  RotateCcw,
  SkipForward,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  XCircle,
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
  evaluateAnswerAction,
  gradeCardAction,
  multipleChoiceAction,
  primeCardAction,
} from "@/server/actions/decks";
import { SessionSummary } from "./session-summary";
import { dispatchPetReact } from "@/lib/pet/events";
import type { Grade } from "@/lib/db/schema";

export interface ReviewCard {
  id: string;
  front: string;
  back: string;
  whyItMatters: string | null;
  referenceSection: string | null;
  userNotes?: string | null;
  repetition: number;
  ease: number;
  deckTopic?: string; // populated in multi-deck sessions
}

// Flow:
//   front     → user attempts recall, reveals back (or enters write/MC mode)
//   writing   → user has typed/spoken a draft; "Reveal answer" shows back
//   back      → user grades. Right/Hard → advance. Wrong → priming.
//   mc_loading→ fetching distractors from AI
//   mc        → user picks one of 4 options
//   priming   → user tries again from new angle; can reveal (→ revealed) or analogy
//   revealed  / analogy → user clicks Next
type Phase =
  | "front"
  | "writing"
  | "back"
  | "mc_loading"
  | "mc"
  | "priming"
  | "revealed"
  | "analogy";

type AiVerdict = "correct" | "partial" | "wrong";

const MC_LABELS = ["A", "B", "C", "D"];

export function ReviewSession({
  deckId,
  deckTopic,
  initialQueue,
  exitHref,
  initialWriteMode = false,
  initialMcMode = false,
}: {
  deckId: string;
  deckTopic: string;
  initialQueue: ReviewCard[];
  exitHref?: string;
  initialWriteMode?: boolean;
  initialMcMode?: boolean;
}) {
  const router = useRouter();

  // Queue state — all advancement is client-side
  const [queue, setQueue] = useState<ReviewCard[]>(initialQueue);
  const [queueIdx, setQueueIdx] = useState(0);
  const [reReviewCounts, setReReviewCounts] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState(() => Date.now());
  // Snapshot at session start; not derived from prop so RSC soft-refreshes
  // (triggered by revalidatePath in gradeCardAction) don't change it mid-session.
  const [originalDue] = useState(initialQueue.length);

  // Session-level tracking for the summary screen
  const [sessionStartTime] = useState(() => Date.now());
  const [gradeLog, setGradeLog] = useState<Array<{ grade: Grade }>>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionDurationMs, setSessionDurationMs] = useState(0);

  // Mode toggles — persist across cards, switchable mid-session
  const [writeMode, setWriteMode] = useState(initialWriteMode);
  const [mcMode, setMcMode] = useState(initialMcMode && !initialWriteMode);

  const currentCard = queue[queueIdx];
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
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [leechSuspended, setLeechSuspended] = useState(false);

  // Write mode state
  const [writeDraft, setWriteDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // AI evaluation state
  const [aiEvalResult, setAiEvalResult] = useState<AiVerdict | null>(null);
  const [aiEvalFeedback, setAiEvalFeedback] = useState<string | null>(null);
  const [aiEvalLoading, setAiEvalLoading] = useState(false);
  const [aiEvalCorrected, setAiEvalCorrected] = useState(false);

  // Multiple choice state
  const [mcOptions, setMcOptions] = useState<string[]>([]);
  const [mcCorrectIndex, setMcCorrectIndex] = useState(0);
  const [mcSelected, setMcSelected] = useState<number | null>(null);
  const [mcLoading, setMcLoading] = useState(false);

  // Ref for testid — set imperatively post-mount to satisfy hooks/purity lint
  const containerRef = useRef<HTMLDivElement>(null);

  const resetCardState = useCallback(() => {
    setPhase("front");
    setPrimingQuestion(null);
    setAnalogy(null);
    setLastInterval(null);
    setWriteDraft("");
    setIsListening(false);
    setAiEvalResult(null);
    setAiEvalFeedback(null);
    setAiEvalCorrected(false);
    setMcOptions([]);
    setMcSelected(null);
  }, []);

  const advance = useCallback(() => {
    const nextIdx = queueIdx + 1;
    if (nextIdx >= queue.length) {
      setSessionDurationMs(Date.now() - sessionStartTime);
      setShowSummary(true);
      return;
    }
    setQueueIdx(nextIdx);
    setStartTime(Date.now());
    resetCardState();
  }, [queueIdx, queue.length, sessionStartTime, resetCardState]);

  const handleGrade = useCallback(
    async (grade: Grade) => {
      setGradeError(null);
      try {
        const durationMs = Date.now() - startTime;
        const result = await gradeCardAction({
          cardId: currentCard.id,
          grade,
          durationMs,
        });
        setLastInterval(result.intervalDays);
        setGradeLog((prev) => [...prev, { grade }]);

        // Tell the pet what happened.
        const xpDelta = result.pet?.delta ?? 0;
        const reactKind: "correct" | "hard" | "wrong" =
          grade === "right" ? "correct" : grade === "hard" ? "hard" : "wrong";
        dispatchPetReact({ kind: reactKind, xpDelta });
        if (result.pet?.leveledUp) {
          dispatchPetReact({ kind: "levelup", level: result.pet.level });
        }
        if (result.pet?.evolved) {
          dispatchPetReact({ kind: "evolve", stage: result.pet.stage });
        }
        if (result.deckFinished) {
          dispatchPetReact({
            kind: "speak",
            message: "I'll remember this deck!",
          });
        }

        if (result.leechSuspended) {
          // Card hit the leech threshold — it's now suspended. Don't re-queue;
          // show a notice and move on.
          setLeechSuspended(true);
          advance();
          return;
        }

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
      } catch (err) {
        setGradeError(err instanceof Error ? err.message : "Grade failed");
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

  const loadMultipleChoice = useCallback(async () => {
    setMcLoading(true);
    setPhase("mc_loading");
    try {
      const r = await multipleChoiceAction(currentCard.id);
      setMcOptions(r.options);
      setMcCorrectIndex(r.correctIndex);
      setPhase("mc");
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Could not load choices");
      setPhase("front");
    } finally {
      setMcLoading(false);
    }
  }, [currentCard.id]);

  const handleMcSelect = useCallback(
    async (idx: number) => {
      if (mcSelected !== null) return; // already selected
      setMcSelected(idx);
      const grade: Grade = idx === mcCorrectIndex ? "right" : "wrong";
      await handleGrade(grade);
    },
    [mcSelected, mcCorrectIndex, handleGrade],
  );

  const requestAiEval = useCallback(async () => {
    if (!writeDraft.trim()) return;
    setAiEvalLoading(true);
    try {
      const r = await evaluateAnswerAction(currentCard.id, writeDraft);
      setAiEvalResult(r.verdict);
      setAiEvalFeedback(r.feedback);
      setAiEvalCorrected(false);
    } catch {
      // non-fatal — just hide the eval UI
    } finally {
      setAiEvalLoading(false);
    }
  }, [currentCard.id, writeDraft]);

  const correctAiEval = useCallback((verdict: AiVerdict) => {
    setAiEvalResult(verdict);
    setAiEvalCorrected(true);
  }, []);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRec = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechRec() as any;
    rec.continuous = true;
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as ArrayLike<SpeechRecognitionResult>)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ");
      setWriteDraft((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (phase === "front") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (mcMode) {
            void loadMultipleChoice();
          } else if (writeMode) {
            setPhase("writing");
          } else {
            setPhase("back");
          }
        }
      } else if (phase === "writing" && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        setPhase("back");
      } else if (phase === "back") {
        if (e.key === "1") void handleGrade("wrong");
        else if (e.key === "2") void handleGrade("hard");
        else if (e.key === "3") void handleGrade("right");
      } else if (phase === "mc") {
        if (e.key === "1") void handleMcSelect(0);
        else if (e.key === "2") void handleMcSelect(1);
        else if (e.key === "3") void handleMcSelect(2);
        else if (e.key === "4") void handleMcSelect(3);
      } else if (
        (phase === "priming" || phase === "revealed" || phase === "analogy") &&
        e.key === "n"
      ) {
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleGrade, handleMcSelect, loadMultipleChoice, advance, writeMode, mcMode]);

  useEffect(() => {
    containerRef.current?.setAttribute("data-testid", "review-ready");
  }, []);

  // Show summary when all cards are done
  if (showSummary) {
    return (
      <SessionSummary
        deckId={deckId}
        exitHref={exitHref}
        gradeLog={gradeLog}
        durationMs={sessionDurationMs}
        originalQueueSize={originalDue}
      />
    );
  }

  const showBackContent =
    phase === "back" || phase === "revealed" || phase === "analogy";

  const dueRemaining = originalDue - Math.min(queueIdx, originalDue);
  const cardNumber = Math.min(queueIdx + 1, originalDue);
  const progressFraction = originalDue > 0 ? cardNumber / originalDue : 0;

  const hasSpeechApi =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Redirect fallback if somehow the queue is empty (shouldn't happen in normal flow)
  if (!currentCard) {
    router.push(exitHref ?? `/decks/${deckId}`);
    return null;
  }

  return (
    <div ref={containerRef} className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between text-sm">
        <Link
          href={`/decks/${deckId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {currentCard.deckTopic ?? deckTopic}
        </Link>
        <div className="flex items-center gap-2 text-muted-foreground">
          {/* Mode toggles */}
          <button
            onClick={() => {
              setWriteMode((w) => !w);
              if (!writeMode) setMcMode(false);
            }}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              writeMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
            title="Toggle write mode"
          >
            <PenLine className="h-3 w-3" />
            Write
          </button>
          <button
            onClick={() => {
              setMcMode((m) => !m);
              if (!mcMode) setWriteMode(false);
            }}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              mcMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
            title="Toggle multiple-choice mode"
          >
            A/B/C
          </button>

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
          <span className="font-mono text-xs">
            {cardNumber} / {originalDue}
          </span>
          <span className="font-mono">
            rep {currentCard.repetition} · ease {currentCard.ease.toFixed(2)}
          </span>
        </div>
      </header>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-1 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressFraction * 100}%` }}
        />
      </div>

      {isReReview && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Re-check — you missed this one earlier
        </div>
      )}

      {gradeError && (
        <div
          role="alert"
          data-testid="grade-error"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          Could not save grade — {gradeError}
        </div>
      )}

      {leechSuspended && (
        <div
          role="status"
          data-testid="leech-suspended"
          className="flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-400/10 px-4 py-2 text-sm text-orange-700 dark:text-orange-400"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Card suspended — too many misses. Add a note in the card editor to help it stick.
        </div>
      )}

      <Card className="min-h-[280px]">
        <CardHeader>
          <CardDescription className="flex items-center justify-between">
            <span>
              {phase === "front" && (writeMode ? "Front — write your recall" : mcMode ? "Front — load choices to answer" : "Front — try to recall")}
              {phase === "writing" && "Your answer — reveal when ready"}
              {phase === "back" && "Back — how did you do?"}
              {phase === "mc_loading" && "Loading choices…"}
              {phase === "mc" && "Pick the correct answer"}
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
          {/* Write mode input in front phase */}
          {phase === "writing" && (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={writeDraft}
                onChange={(e) => setWriteDraft(e.target.value)}
                placeholder="Type your answer here…"
                className="min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Cmd+Enter to reveal answer
              </p>
            </div>
          )}

          {/* User draft shown above correct answer */}
          {showBackContent && writeDraft && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your answer</span>
              <p className="mt-1 whitespace-pre-wrap text-foreground/80">{writeDraft}</p>
            </div>
          )}

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
              {currentCard.userNotes && (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">My note: </span>
                  <span className="text-muted-foreground">{currentCard.userNotes}</span>
                </div>
              )}
            </>
          )}

          {/* AI evaluation result */}
          {showBackContent && aiEvalResult && (
            <div className={`rounded-md border p-3 text-sm ${
              aiEvalResult === "correct"
                ? "border-success/40 bg-success/10"
                : aiEvalResult === "partial"
                  ? "border-warning/40 bg-warning/10"
                  : "border-destructive/40 bg-destructive/10"
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                {aiEvalResult === "correct" && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                {aiEvalResult === "partial" && <RotateCcw className="h-4 w-4 text-warning shrink-0" />}
                {aiEvalResult === "wrong" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <span className={`font-medium capitalize ${
                  aiEvalResult === "correct" ? "text-success" : aiEvalResult === "partial" ? "text-warning" : "text-destructive"
                }`}>
                  {aiEvalResult}
                </span>
                {aiEvalCorrected && (
                  <span className="text-xs text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
                    Manually corrected
                  </span>
                )}
              </div>
              {aiEvalFeedback && (
                <p className="mt-1 text-muted-foreground">{aiEvalFeedback}</p>
              )}
              {/* Correction buttons */}
              <div className="mt-2 flex gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground self-center">Disagree?</span>
                {(["correct", "partial", "wrong"] as AiVerdict[])
                  .filter((v) => v !== aiEvalResult)
                  .map((v) => (
                    <button
                      key={v}
                      onClick={() => correctAiEval(v)}
                      className="text-xs border border-border rounded px-1.5 py-0.5 hover:bg-muted capitalize"
                    >
                      Actually {v}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* MC loading spinner */}
          {phase === "mc_loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating choices…
            </div>
          )}

          {/* MC options */}
          {phase === "mc" && mcOptions.length > 0 && (
            <div className="space-y-2">
              {mcOptions.map((option, idx) => {
                const isSelected = mcSelected === idx;
                const isCorrect = idx === mcCorrectIndex;
                let variant: "outline" | "success" | "destructive" = "outline";
                if (mcSelected !== null) {
                  if (isCorrect) variant = "success";
                  else if (isSelected) variant = "destructive";
                }
                return (
                  <Button
                    key={idx}
                    variant={variant}
                    className="w-full justify-start gap-3 text-left h-auto py-2"
                    onClick={() => void handleMcSelect(idx)}
                    disabled={mcSelected !== null && !isSelected && !isCorrect}
                  >
                    <span className="shrink-0 font-mono text-xs opacity-60">
                      {MC_LABELS[idx]}
                    </span>
                    <span className="whitespace-normal">{option}</span>
                    <kbd className="ml-auto shrink-0 text-xs opacity-50">{idx + 1}</kbd>
                  </Button>
                );
              })}
            </div>
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
        {/* Front phase actions */}
        {phase === "front" && !mcMode && !writeMode && (
          <Button onClick={() => setPhase("back")} className="w-full" size="lg">
            Show answer <kbd className="ml-2 text-xs opacity-70">space</kbd>
          </Button>
        )}

        {phase === "front" && writeMode && (
          <Button onClick={() => setPhase("writing")} className="w-full" size="lg">
            <PenLine className="h-4 w-4" />
            Write your answer <kbd className="ml-2 text-xs opacity-70">space</kbd>
          </Button>
        )}

        {phase === "front" && !writeMode && !mcMode && null /* fallthrough handled */ }

        {phase === "front" && mcMode && (
          <Button
            onClick={() => void loadMultipleChoice()}
            className="w-full"
            size="lg"
            disabled={mcLoading}
          >
            {mcLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Load choices <kbd className="ml-2 text-xs opacity-70">space</kbd>
          </Button>
        )}

        {/* Writing phase actions */}
        {phase === "writing" && (
          <div className="flex gap-2">
            {hasSpeechApi && (
              <Button
                variant="outline"
                size="lg"
                onClick={isListening ? stopListening : startListening}
                className={isListening ? "border-destructive text-destructive" : ""}
              >
                {isListening ? (
                  <><MicOff className="h-4 w-4" /> Stop</>
                ) : (
                  <><Mic className="h-4 w-4" /> Dictate</>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setPhase("back")}
            >
              Show answer directly
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => setPhase("back")}
              disabled={!writeDraft.trim()}
            >
              Reveal &amp; compare <kbd className="ml-1 text-xs opacity-70">⌘↵</kbd>
            </Button>
          </div>
        )}

        {/* Back phase actions */}
        {phase === "back" && (
          <>
            {writeDraft && !aiEvalResult && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void requestAiEval()}
                disabled={aiEvalLoading}
              >
                {aiEvalLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Evaluate my answer with AI</>
                )}
              </Button>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="destructive"
                onClick={() => void handleGrade("wrong")}
                disabled={primingLoading}
                size="lg"
              >
                <ThumbsDown className="h-4 w-4" />
                Wrong <kbd className="ml-1 text-xs opacity-70">1</kbd>
              </Button>
              <Button
                variant="warning"
                onClick={() => void handleGrade("hard")}
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
                Hard <kbd className="ml-1 text-xs opacity-70">2</kbd>
              </Button>
              <Button
                variant="success"
                onClick={() => void handleGrade("right")}
                size="lg"
              >
                <ThumbsUp className="h-4 w-4" />
                Right <kbd className="ml-1 text-xs opacity-70">3</kbd>
              </Button>
            </div>
          </>
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
              onClick={() => void requestAnalogy()}
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
            onClick={() => void requestAnalogy()}
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
