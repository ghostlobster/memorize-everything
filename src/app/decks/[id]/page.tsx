import Link from "next/link";
import { notFound } from "next/navigation";
import { Brain, Play, ListChecks, Network, Lightbulb } from "lucide-react";
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
import { formatRelative } from "@/lib/utils";
import { GeneratingDeckView } from "./generating-view";

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

  // status === "ready" — sourceMarkdown is guaranteed non-null
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const dueCount = deck.cards.filter(
    (c) => c.dueAt.getTime() <= now,
  ).length;

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
              {dueCount > 0 && (
                <Badge variant="warning">{dueCount} due</Badge>
              )}
            </div>
          </div>
          <Button asChild size="lg" disabled={dueCount === 0}>
            <Link href={`/decks/${deck.id}/review`}>
              <Play className="h-4 w-4" />
              {dueCount > 0 ? "Start review" : "All reviewed"}
            </Link>
          </Button>
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
        <div className="grid gap-3 md:grid-cols-2">
          {deck.cards.map((c, idx) => (
            <Card key={c.id} className="h-full">
              <CardHeader>
                <CardDescription className="flex items-center justify-between text-xs">
                  <span>Card {idx + 1}</span>
                  {c.referenceSection && (
                    <Badge variant="outline" className="font-mono">
                      {c.referenceSection}
                    </Badge>
                  )}
                </CardDescription>
                <CardTitle className="text-base leading-snug">
                  {c.front}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm">
                <p>{c.back}</p>
                {c.whyItMatters && (
                  <p className="text-muted-foreground">{c.whyItMatters}</p>
                )}
                <div className="flex gap-3 pt-2 text-xs text-muted-foreground">
                  <span>rep {c.repetition}</span>
                  <span>ease {Number(c.ease).toFixed(2)}</span>
                  <span>
                    next{" "}
                    {c.dueAt.getTime() <= now
                      ? "now"
                      : formatRelative(c.dueAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
