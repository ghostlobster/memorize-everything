import Link from "next/link";
import { BookOpen, Plus, Sparkles, GraduationCap } from "lucide-react";
import { getUser } from "@/lib/auth/require-user";
import { signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listUserDecks, listArchivedDecks } from "@/server/actions/decks";
import { listUserGroups } from "@/server/actions/groups";
import { DeckSelectorGrid } from "@/components/decks/deck-selector-grid";
import { ArchivedDeckList } from "@/components/decks/archived-deck-list";

export default async function HomePage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-8 py-16 text-center">
        <div className="space-y-3">
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            Memorize everything.
          </h1>
          <p className="mx-auto max-w-xl text-balance text-muted-foreground">
            Give a topic. Get a Feynman-style deep dive, a knowledge graph,
            spaced-repetition flashcards, and a self-correction coach that
            primes you before revealing answers.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <Button size="lg" type="submit">
            Sign in with GitHub to begin
          </Button>
        </form>
        <div className="grid gap-4 pt-10 md:grid-cols-3">
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Knowledge synthesis"
            body="Feynman-technique explanations with LaTeX and diagrams."
          />
          <Feature
            icon={<BookOpen className="h-5 w-5" />}
            title="Active recall"
            body="8–20 flashcards per topic, each grounded in a section reference."
          />
          <Feature
            icon={<GraduationCap className="h-5 w-5" />}
            title="Spaced repetition"
            body="SM-2 scheduler with self-correction priming on every miss."
          />
        </div>
      </div>
    );
  }

  const [decks, groups, archivedDecks] = await Promise.all([
    listUserDecks(user.id),
    listUserGroups(user.id),
    listArchivedDecks(user.id),
  ]);
  const totalDue = decks.reduce((n, d) => n + Number(d.dueCount ?? 0), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-muted-foreground">
            {totalDue > 0
              ? `${totalDue} card${totalDue === 1 ? "" : "s"} due across your decks.`
              : "No cards due right now. Great time to learn something new."}
          </p>
        </div>
        <div className="flex gap-2">
          {totalDue > 0 && (
            <Button asChild variant="outline">
              <Link href="/review">Review due</Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/decks/new">
              <Plus className="h-4 w-4" />
              New deck
            </Link>
          </Button>
        </div>
      </header>

      {decks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Start your first deck</CardTitle>
            <CardDescription>
              Pick any topic — &ldquo;Transformer attention&rdquo;, &ldquo;Krebs cycle&rdquo;,
              &ldquo;Byzantine fault tolerance&rdquo; — and we&apos;ll generate a full
              learning module.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/decks/new">
                <Plus className="h-4 w-4" />
                Create deck
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DeckSelectorGrid
          decks={decks.map((d) => ({
            id: d.id,
            topic: d.topic,
            level: d.level,
            goal: d.goal,
            status: d.status,
            createdAt: d.createdAt,
            modelId: d.modelId,
            groupId: d.groupId ?? null,
            cardCount: Number(d.cardCount ?? 0),
            dueCount: Number(d.dueCount ?? 0),
          }))}
          groups={groups}
        />
      )}

      <ArchivedDeckList
        decks={archivedDecks.map((d) => ({
          id: d.id,
          topic: d.topic,
          level: d.level,
          goal: d.goal,
          status: d.status,
          createdAt: d.createdAt,
          modelId: d.modelId,
          groupId: d.groupId ?? null,
          cardCount: Number(d.cardCount ?? 0),
          dueCount: 0,
        }))}
      />
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">{icon}</div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        {body}
      </CardContent>
    </Card>
  );
}
