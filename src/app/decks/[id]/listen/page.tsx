import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getDeckForUser } from "@/server/actions/decks";
import { PodcastPlayer } from "@/components/audio/podcast-player";

export default async function ListenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { id } = await params;
  const { sub } = await searchParams;
  const user = await requireUser();

  const deck = await getDeckForUser(id, user.id);
  if (!deck) notFound();

  const cards = deck.cards.map((c) => ({
    front: c.front,
    back: c.back,
    whyItMatters: c.whyItMatters,
  }));

  const subMode = sub === "drill" ? "drill" : "synthesis";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <div className="text-sm text-muted-foreground">
          <Link href={`/decks/${deck.id}`} className="hover:text-foreground">
            ← {deck.topic}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Listen</h1>
        <p className="text-sm text-muted-foreground">
          {cards.length} card{cards.length !== 1 ? "s" : ""} ·{" "}
          <Link
            href={`/decks/${id}/listen?sub=synthesis`}
            className={subMode === "synthesis" ? "font-medium text-foreground" : "hover:text-foreground"}
          >
            Synthesis
          </Link>
          {" · "}
          <Link
            href={`/decks/${id}/listen?sub=drill`}
            className={subMode === "drill" ? "font-medium text-foreground" : "hover:text-foreground"}
          >
            Drill
          </Link>
        </p>
      </header>

      <PodcastPlayer cards={cards} deckTopic={deck.topic} sub={subMode} />
    </div>
  );
}
