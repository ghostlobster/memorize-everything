import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, lte, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { cards, decks } from "@/lib/db/schema";
import { ReviewSession } from "./review-session";
import { ReviewModeSelect } from "@/components/review/review-mode-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DeckReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const user = await requireUser();

  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, id), eq(decks.userId, user.id)),
  });
  if (!deck) notFound();

  const allDue = await db
    .select({
      id: cards.id,
      front: cards.front,
      back: cards.back,
      whyItMatters: cards.whyItMatters,
      referenceSection: cards.referenceSection,
      userNotes: cards.userNotes,
      repetition: cards.repetition,
      ease: cards.ease,
      state: cards.state,
    })
    .from(cards)
    .where(
      and(eq(cards.deckId, id), lte(cards.dueAt, new Date()), eq(cards.suspended, false)),
    )
    .orderBy(asc(cards.dueAt), asc(cards.orderIdx));

  if (allDue.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All done 🎉</CardTitle>
            <CardDescription>
              No cards in <span className="font-medium">{deck.topic}</span> are
              due right now. Come back later — SM-2 will schedule the next batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/decks/${deck.id}`}>Back to deck</Link>
            </Button>
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!mode) {
    const criticalCount = allDue.filter(
      (c) => c.state === "learning" || Number(c.ease) <= 1.6,
    ).length;
    return (
      <ReviewModeSelect
        deckId={deck.id}
        deckTopic={deck.topic}
        fullCount={allDue.length}
        criticalCount={criticalCount}
      />
    );
  }

  const initialQueue = (
    mode === "critical"
      ? allDue
          .filter((c) => c.state === "learning" || Number(c.ease) <= 1.6)
          .sort((a, b) => Number(a.ease) - Number(b.ease))
      : allDue
  ).map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    whyItMatters: c.whyItMatters,
    referenceSection: c.referenceSection,
    userNotes: c.userNotes,
    repetition: c.repetition,
    ease: Number(c.ease),
  }));

  if (initialQueue.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>No critical cards</CardTitle>
            <CardDescription>
              No struggling cards in{" "}
              <span className="font-medium">{deck.topic}</span> right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/decks/${deck.id}/review?mode=full`}>
                Full review instead
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/decks/${deck.id}`}>Back to deck</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReviewSession
      deckId={deck.id}
      deckTopic={deck.topic}
      initialQueue={initialQueue}
    />
  );
}
