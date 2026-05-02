import Link from "next/link";
import { notFound } from "next/navigation";
import { Brain, Headphones, Play, ListChecks, Network, Lightbulb } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getDeckForUser } from "@/server/actions/decks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { MermaidView } from "@/components/mermaid/mermaid-view";
import { GeneratingDeckView } from "./generating-view";
import { DeckActions } from "@/components/decks/deck-actions";
import { CardGrid } from "@/components/cards/card-grid";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeckForUser(id, user.id);
  if (!deck) notFound();

  if (deck.status === "generating") {
    return (
      <div className="mx-auto max-w-5xl">
        <GeneratingDeckView deckId={deck.id} topic={deck.topic} />
      </div>
    );
  }

  if (deck.status === "failed") {
    return (
      <div className="mx-auto max-w-5xl">
        <GeneratingDeckView
          deckId={deck.id}
          topic={deck.topic}
          initialError={
            deck.generationError ??
            "An unexpected error occurred during generation."
          }
        />
      </div>
    );
  }

  // status === "ready" | "archived" — sourceMarkdown is guaranteed non-null
  const isArchived = deck.status === "archived";
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const dueCount = deck.cards.filter(
    (c) => !c.suspended && c.dueAt.getTime() <= now,
  ).length;
  const suspendedCount = deck.cards.filter((c) => c.suspended).length;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {deck.topic}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{deck.level}</Badge>
              <Badge variant="secondary">{deck.goal}</Badge>
              <Badge variant="outline">{deck.cards.length} cards</Badge>
              {deck.modelProvider && deck.modelId && (
                <Badge variant="outline" className="font-mono">
                  {deck.modelProvider}/{deck.modelId}
                </Badge>
              )}
              {isArchived && (
                <Badge variant="secondary">Archived</Badge>
              )}
              {!isArchived && dueCount > 0 && (
                <Badge variant="warning">{dueCount} due</Badge>
              )}
              {suspendedCount > 0 && (
                <Badge variant="secondary">{suspendedCount} suspended</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="lg">
              <Link href={`/decks/${deck.id}/listen`}>
                <Headphones className="h-4 w-4" />
                Listen
              </Link>
            </Button>
            {!isArchived && (
              <Button asChild size="lg" disabled={dueCount === 0}>
                <Link href={`/decks/${deck.id}/review`}>
                  <Play className="h-4 w-4" />
                  {dueCount > 0 ? "Start review" : "All reviewed"}
                </Link>
              </Button>
            )}
            <DeckActions deckId={deck.id} isArchived={isArchived} />
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <SectionTitle icon={<Brain className="h-4 w-4" />} title="Phase 1 — Knowledge Synthesis" />
        <MarkdownView>{deck.sourceMarkdown!}</MarkdownView>
      </section>

      {deck.mermaidSrc && (
        <section className="space-y-4">
          <SectionTitle
            icon={<Network className="h-4 w-4" />}
            title="Phase 2 — Knowledge Graph"
          />
          <MermaidView source={deck.mermaidSrc} />
        </section>
      )}

      <section className="space-y-4">
        <SectionTitle
          icon={<ListChecks className="h-4 w-4" />}
          title={`Phase 3 — Flashcards (${deck.cards.length})`}
        />
        <CardGrid cards={deck.cards} now={now} />
      </section>

      {(deck.mnemonics?.length || deck.interleaving) && (
        <section className="space-y-4">
          <SectionTitle
            icon={<Lightbulb className="h-4 w-4" />}
            title="Phase 4 — Memory Aids"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {deck.mnemonics?.map((m, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <CardDescription className="font-mono text-base text-foreground">
                    {m.device}
                  </CardDescription>
                </CardHeader>
                {m.explanation && (
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    {m.explanation}
                  </CardContent>
                )}
              </Card>
            ))}
            {deck.interleaving && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Interleave: {deck.interleaving.topic}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {deck.interleaving.reason}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {title}
    </div>
  );
}
