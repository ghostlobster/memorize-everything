import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { listDueCardsForDecks } from "@/server/actions/decks";
import { ReviewSession } from "@/app/decks/[id]/review/review-session";
import { ReviewModeSelect } from "@/components/review/review-mode-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function MultiDeckReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ decks?: string; mode?: string }>;
}) {
  const { decks: decksParam, mode } = await searchParams;
  const user = await requireUser();

  const deckIds = (decksParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (deckIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>No decks selected</CardTitle>
            <CardDescription>
              Go back home and select at least one deck to start a session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDue = await listDueCardsForDecks(user.id, deckIds);

  if (allDue.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>All done 🎉</CardTitle>
            <CardDescription>
              No cards are due across the selected decks right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionLabel = `${deckIds.length} deck${deckIds.length === 1 ? "" : "s"}`;

  if (!mode) {
    const criticalCount = allDue.filter(
      (c) => c.state === "learning" || Number(c.ease) <= 1.6,
    ).length;
    const base = `/review/multi?decks=${deckIds.join(",")}`;
    return (
      <ReviewModeSelect
        deckId={deckIds[0]}
        deckTopic={sessionLabel}
        fullCount={allDue.length}
        criticalCount={criticalCount}
        fullHref={`${base}&mode=full`}
        criticalHref={`${base}&mode=critical`}
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
    deckTopic: c.deckTopic,
  }));

  if (initialQueue.length === 0) {
    const base = `/review/multi?decks=${deckIds.join(",")}`;
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>No critical cards</CardTitle>
            <CardDescription>
              None of the selected decks have struggling cards right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`${base}&mode=full`}>Full review instead</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReviewSession
      deckId={deckIds[0]}
      deckTopic={sessionLabel}
      initialQueue={initialQueue}
      exitHref="/"
    />
  );
}
