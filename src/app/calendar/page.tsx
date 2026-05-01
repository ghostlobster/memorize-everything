import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getScheduledByDay, getCompletedByDay } from "@/server/actions/progress";
import {
  buildMonthGrid,
  parseMonthParam,
  prevMonth,
  nextMonth,
} from "@/lib/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const user = await requireUser();

  const { year, month } = parseMonthParam(monthParam);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);

  const [scheduled, completed] = await Promise.all([
    getScheduledByDay(user.id, from, to),
    getCompletedByDay(user.id, from, to),
  ]);

  // Build lookup maps keyed by ISO date string
  type DaySchedule = {
    deckId: string;
    topic: string;
    count: number;
    firstReview: number;
    secondReview: number;
    thirdReview: number;
    matureReview: number;
  };
  const scheduledMap = new Map<string, DaySchedule[]>();
  for (const row of scheduled) {
    const key = row.day.slice(0, 10);
    if (!scheduledMap.has(key)) scheduledMap.set(key, []);
    scheduledMap.get(key)!.push(row);
  }

  const completedMap = new Map<string, { count: number; wrongs: number }>();
  for (const row of completed) {
    completedMap.set(row.day.slice(0, 10), {
      count: row.count,
      wrongs: row.wrongs,
    });
  }

  const grid = buildMonthGrid(year, month);
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Review calendar</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href={`/calendar?month=${prevMonth(year, month)}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">
            {monthName}
          </span>
          <Button asChild variant="outline" size="icon">
            <Link href={`/calendar?month=${nextMonth(year, month)}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500/70" />
          1st review (new)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          2nd review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          3rd+ review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          Completed
        </span>
      </div>

      <Card>
        <CardContent className="p-4">
          {/* Weekday headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.flat().map((dayStr, idx) => {
              if (!dayStr) {
                return <div key={`pad-${idx}`} className="h-20 rounded-md" />;
              }

              const isToday = dayStr === todayStr;
              const isPast = dayStr < todayStr;
              const isFuture = dayStr > todayStr;

              const daySchedules = scheduledMap.get(dayStr) ?? [];
              const totalScheduled = daySchedules.reduce(
                (n, r) => n + r.count,
                0,
              );
              const firstReviewTotal = daySchedules.reduce(
                (n, r) => n + r.firstReview,
                0,
              );
              const secondReviewTotal = daySchedules.reduce(
                (n, r) => n + r.secondReview,
                0,
              );
              const matureReviewTotal = daySchedules.reduce(
                (n, r) => n + r.thirdReview + r.matureReview,
                0,
              );
              const completedDay = completedMap.get(dayStr);

              const dayNum = parseInt(dayStr.slice(8), 10);

              // Build session link for future days with due cards
              const deckIdsForDay = [
                ...new Set(daySchedules.map((r) => r.deckId)),
              ];
              const sessionLink =
                isFuture && totalScheduled > 0
                  ? `/review/multi?decks=${deckIdsForDay.join(",")}`
                  : null;

              const cell = (
                <div
                  className={cn(
                    "flex h-20 flex-col rounded-md border p-1.5 text-xs transition-colors",
                    isToday && "border-primary ring-1 ring-primary/40",
                    !isToday && "border-transparent",
                    isPast && "bg-muted/20",
                    isFuture && totalScheduled > 0 && "hover:border-primary/30 hover:bg-accent/40 cursor-pointer",
                  )}
                >
                  <span
                    className={cn(
                      "mb-1 font-medium",
                      isToday && "text-primary",
                      isPast && "text-muted-foreground",
                    )}
                  >
                    {dayNum}
                  </span>

                  {/* Future: milestone dots */}
                  {(isFuture || isToday) && totalScheduled > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {totalScheduled} due
                      </span>
                      <div className="flex flex-wrap gap-0.5">
                        {firstReviewTotal > 0 && (
                          <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500/70" />
                            {firstReviewTotal}
                          </span>
                        )}
                        {secondReviewTotal > 0 && (
                          <span className="flex items-center gap-0.5 text-yellow-600 dark:text-yellow-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500/70" />
                            {secondReviewTotal}
                          </span>
                        )}
                        {matureReviewTotal > 0 && (
                          <span className="flex items-center gap-0.5 text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success/70" />
                            {matureReviewTotal}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Past: completed count */}
                  {isPast && completedDay && completedDay.count > 0 && (
                    <span className="text-muted-foreground">
                      ✓ {completedDay.count}
                      {completedDay.wrongs > 0 && (
                        <span className="text-warning"> · {completedDay.wrongs} ✗</span>
                      )}
                    </span>
                  )}
                </div>
              );

              return sessionLink ? (
                <Link key={dayStr} href={sessionLink}>
                  {cell}
                </Link>
              ) : (
                <div key={dayStr}>{cell}</div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This month</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="tabular-nums text-2xl font-semibold">
              {[...scheduledMap.values()]
                .flat()
                .reduce((n, r) => n + r.count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">cards scheduled</p>
          </div>
          <div>
            <p className="tabular-nums text-2xl font-semibold">
              {[...completedMap.values()].reduce((n, r) => n + r.count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">reviews done</p>
          </div>
          <div>
            <p className="tabular-nums text-2xl font-semibold">
              {scheduledMap.size}
            </p>
            <p className="text-xs text-muted-foreground">active days</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
