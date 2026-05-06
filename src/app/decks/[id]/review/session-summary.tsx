"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Flame, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeBestStreak, formatDuration } from "@/lib/sr/session-stats";
import { dispatchPetReact } from "@/lib/pet/events";
import type { Grade } from "@/lib/db/schema";

interface SessionSummaryProps {
  deckId: string;
  exitHref?: string;
  gradeLog: Array<{ grade: Grade }>;
  durationMs: number;
  originalQueueSize: number;
}

export function SessionSummary({
  deckId,
  exitHref,
  gradeLog,
  durationMs,
  originalQueueSize,
}: SessionSummaryProps) {
  const total = gradeLog.length;
  const rightCount = gradeLog.filter((g) => g.grade === "right").length;
  const hardCount = gradeLog.filter((g) => g.grade === "hard").length;
  const wrongCount = gradeLog.filter((g) => g.grade === "wrong").length;
  const accuracyPct =
    total > 0 ? Math.round(((rightCount + hardCount) / total) * 100) : 0;
  const bestStreak = computeBestStreak(gradeLog.map((g) => g.grade));
  const durationLabel = formatDuration(durationMs);

  useEffect(() => {
    dispatchPetReact({ kind: "celebrate" });
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Session complete
        </h1>
        <p className="text-muted-foreground">
          You reviewed {originalQueueSize} card
          {originalQueueSize !== 1 ? "s" : ""} from this deck.
        </p>
      </header>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Accuracy"
          value={`${accuracyPct}%`}
          highlight={accuracyPct >= 80}
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Reviewed"
          value={String(total)}
        />
        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label="Best streak"
          value={String(bestStreak)}
        />
        <StatTile
          icon={<Timer className="h-4 w-4" />}
          label="Duration"
          value={durationLabel}
        />
      </div>

      {/* Grade breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Grade breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <GradeRow
            label="Right"
            count={rightCount}
            total={total}
            colorClass="bg-success"
          />
          <GradeRow
            label="Hard"
            count={hardCount}
            total={total}
            colorClass="bg-warning"
          />
          <GradeRow
            label="Wrong"
            count={wrongCount}
            total={total}
            colorClass="bg-destructive"
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={exitHref ?? `/decks/${deckId}`}>Return to deck</Link>
        </Button>
        <Button asChild>
          <Link href={`/decks/${deckId}/review`}>Review again</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <span
          className={`text-2xl font-bold tabular-nums ${highlight ? "text-success" : ""}`}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

function GradeRow({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-12 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
        {count} ({pct}%)
      </span>
    </div>
  );
}
