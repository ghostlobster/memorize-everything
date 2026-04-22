import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, lte, count } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { cards, decks } from "@/lib/db/schema";
import { nextDueCardInDeck } from "@/server/actions/decks";
import { ReviewSession } from "./review-session";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, id), eq(decks.userId, user.id)),
  });
  if (!deck) notFound();

  const next = await nextDueCardInDeck(id, user.id);
  const [{ remaining }] = await db
    .select({ remaining: count() })
    .from(cards)
    .where(and(eq(cards.deckId, id), lte(cards.dueAt, new Date())));

  if (!next) {
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

  return (
    <ReviewSession
      deckId={deck.id}
      deckTopic={deck.topic}
      remaining={Number(remaining)}
      card={{
        id: next.id,
        front: next.front,
        back: next.back,
        whyItMatters: next.whyItMatters,
        referenceSection: next.referenceSection,
        repetition: next.repetition,
        ease: Number(next.ease),
      }}
    />
  );
}
