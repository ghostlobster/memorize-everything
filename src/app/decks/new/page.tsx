import { requireUser } from "@/lib/auth/require-user";
import { createDeckAction } from "@/server/actions/decks";
import { NewDeckForm } from "./new-deck-form";

export default async function NewDeckPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New deck</h1>
        <p className="text-sm text-muted-foreground">
          Pick a topic. We&apos;ll generate a Feynman-style synthesis, a knowledge
          graph, flashcards, mnemonics, and an interleaving suggestion in one
          pass. Generation takes 20–60 seconds.
        </p>
      </header>
      <NewDeckForm action={createDeckAction} />
    </div>
  );
}
