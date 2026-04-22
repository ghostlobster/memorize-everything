import Link from "next/link";
import { Play, PartyPopper } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { listDueCardsForUser } from "@/server/actions/decks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";

export default async function GlobalReviewPage() {
  const user = await requireUser();
  const due = await listDueCardsForUser(user.id, 200);

  // group by deck
  const byDeck = new Map<
    string,
    { topic: string; items: typeof due }
  >();
  for (const row of due) {
    if (!byDeck.has(row.deckId)) {
      byDeck.set(row.deckId, { topic: row.topic, items: [] });
    }
    byDeck.get(row.deckId)!.items.push(row);
  }

  if (due.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-success" />
              Inbox zero
            </CardTitle>
            <CardDescription>
              No cards due across any of your decks. Spaced repetition works —
              come back later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/decks/new">New deck</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Due today</h1>
        <p className="text-muted-foreground">
          {due.length} card{due.length === 1 ? "" : "s"} across{" "}
          {byDeck.size} deck{byDeck.size === 1 ? "" : "s"}.
        </p>
      </header>

      <div className="space-y-4">
        {[...byDeck.entries()].map(([deckId, { topic, items }]) => (
          <Card key={deckId}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{topic}</CardTitle>
                <CardDescription>
                  {items.length} due ·{" "}
                  <span className="text-xs">
                    oldest {formatRelative(items[0].dueAt)}
                  </span>
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link href={`/decks/${deckId}/review`}>
                  <Play className="h-3.5 w-3.5" />
                  Review {items.length}
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {items.slice(0, 4).map((c) => (
                  <li
                    key={c.cardId}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{c.front}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      rep {c.repetition}
                    </Badge>
                  </li>
                ))}
                {items.length > 4 && (
                  <li className="text-xs italic">
                    …and {items.length - 4} more
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
