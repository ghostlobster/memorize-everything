import { Flame, TrendingUp, Brain, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import {
  getCardStats,
  getReviewActivity,
  getUpcomingDue,
  getPerDeckStats,
} from "@/server/actions/progress";
import { computeStreak } from "@/lib/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProgressPage() {
  const user = await requireUser();

  const [stats, activity, upcoming, deckStats] = await Promise.all([
    getCardStats(user.id),
    getReviewActivity(user.id, 14),
    getUpcomingDue(user.id),
    getPerDeckStats(user.id),
  ]);

  const streak = computeStreak(activity.map((r) => r.day));
  const totalReviews = activity.reduce((n, r) => n + r.count, 0);

  // Build full 14-day date range for activity chart
  const activityMap = new Map(activity.map((r) => [r.day.slice(0, 10), r]));
  const days14: { date: string; label: string; count: number; wrongs: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const entry = activityMap.get(key);
    days14.push({
      date: key,
      label: i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
      count: entry?.count ?? 0,
      wrongs: entry?.wrongs ?? 0,
    });
  }
  const maxActivity = Math.max(...days14.map((d) => d.count), 1);

  // Upcoming due — build 7-day range
  const upcomingMap = new Map(upcoming.map((r) => [r.day.slice(0, 10), r.count]));
  const days7: { date: string; label: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    days7.push({
      date: key,
      label: i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
      count: upcomingMap.get(key) ?? 0,
    });
  }
  const maxUpcoming = Math.max(...days7.map((d) => d.count), 1);

  const totalCards = stats?.total ?? 0;
  const matureCards = stats?.mature ?? 0;
  const strugglingCards = stats?.struggling ?? 0;
  const newCards = stats?.newCards ?? 0;
  const learningCards = stats?.learning ?? 0;
  const reviewCards = stats?.review ?? 0;

  const maturePct = totalCards > 0 ? Math.round((matureCards / totalCards) * 100) : 0;
  const newPct = totalCards > 0 ? Math.round((newCards / totalCards) * 100) : 0;
  const learningPct = totalCards > 0 ? Math.round((learningCards / totalCards) * 100) : 0;
  const reviewPct = totalCards > 0 ? Math.round((reviewCards / totalCards) * 100) : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Your progress</h1>
        <p className="text-muted-foreground">
          {totalCards} cards across your decks.
        </p>
      </header>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Cards total"
          value={totalCards}
          icon={<Brain className="h-4 w-4" />}
        />
        <StatTile
          label="Mature (rep ≥ 3)"
          value={matureCards}
          sub={`${maturePct}%`}
          variant="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatTile
          label="Struggling (ease ≤ 1.6)"
          value={strugglingCards}
          variant={strugglingCards > 0 ? "warning" : "default"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatTile
          label="Day streak"
          value={streak}
          sub={streak === 1 ? "day" : "days"}
          variant={streak > 0 ? "success" : "default"}
          icon={<Flame className="h-4 w-4" />}
        />
      </div>

      {/* Card state distribution */}
      {totalCards > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Card states</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="bg-muted-foreground/40 transition-all"
                style={{ width: `${newPct}%` }}
                title={`New: ${newCards}`}
              />
              <div
                className="bg-warning/70 transition-all"
                style={{ width: `${learningPct}%` }}
                title={`Learning: ${learningCards}`}
              />
              <div
                className="bg-success/70 transition-all"
                style={{ width: `${reviewPct}%` }}
                title={`Review: ${reviewCards}`}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                New ({newCards})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                Learning ({learningCards})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                Review ({reviewCards})
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 14-day activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reviews last 14 days</CardTitle>
          <CardDescription>{totalReviews} total</CardDescription>
        </CardHeader>
        <CardContent>
          {totalReviews === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="flex h-28 items-end gap-1">
              {days14.map(({ date, label, count, wrongs }) => {
                const rights = count - wrongs;
                const allRight = wrongs === 0 && count > 0;
                const hasWrongs = wrongs > 0;
                const heightPct = Math.round((count / maxActivity) * 100);
                return (
                  <div key={date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      {count > 0 ? (
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            allRight
                              ? "bg-success/60"
                              : hasWrongs && rights === 0
                              ? "bg-destructive/50"
                              : "bg-warning/60"
                          }`}
                          style={{ height: `${heightPct}%` }}
                          title={`${count} reviews (${wrongs} wrong)`}
                        />
                      ) : (
                        <div className="w-full rounded-t-sm bg-muted/40" style={{ height: "4px" }} />
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming 7 days */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Due next 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          {days7.every((d) => d.count === 0) ? (
            <p className="text-sm text-muted-foreground">
              No cards scheduled in the next 7 days.
            </p>
          ) : (
            <div className="flex h-20 items-end gap-1">
              {days7.map(({ date, label, count }) => {
                const heightPct = Math.round((count / maxUpcoming) * 100);
                return (
                  <div key={date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      {count > 0 ? (
                        <div
                          className="w-full rounded-t-sm bg-primary/50 transition-all"
                          style={{ height: `${heightPct}%` }}
                          title={`${count} due`}
                        />
                      ) : (
                        <div className="w-full rounded-t-sm bg-muted/40" style={{ height: "4px" }} />
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-deck health */}
      {deckStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Deck health</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Deck</th>
                  <th className="pb-2 pr-4 font-medium">Cards</th>
                  <th className="pb-2 pr-4 font-medium">Mature</th>
                  <th className="pb-2 pr-4 font-medium">Struggling</th>
                  <th className="pb-2 font-medium">Due now</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deckStats.map((d) => {
                  const pct = d.total > 0 ? Math.round((d.mature / d.total) * 100) : 0;
                  return (
                    <tr key={d.deckId} className="text-sm">
                      <td className="py-2 pr-4 font-medium">{d.topic}</td>
                      <td className="py-2 pr-4 tabular-nums">{d.total}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-success/70"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {d.struggling > 0 ? (
                          <Badge variant="warning" className="text-xs">
                            {d.struggling}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        {d.dueNow > 0 ? (
                          <Badge variant="warning" className="text-xs">
                            {d.dueNow}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  variant = "default",
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  variant?: "default" | "success" | "warning";
  icon?: React.ReactNode;
}) {
  const colors = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <span className={colors[variant]}>{icon}</span>
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-semibold tabular-nums ${colors[variant]}`}>
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
