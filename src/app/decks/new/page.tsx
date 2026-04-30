import { requireUser } from "@/lib/auth/require-user";
import { availableAllModels } from "@/lib/ai/models";
import { NewDeckForm } from "./new-deck-form";

export default async function NewDeckPage() {
  await requireUser();
  const availableModels = availableAllModels().map((m) => ({
    provider: m.provider,
    modelId: m.id,
    label: m.label,
  }));
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
      <NewDeckForm availableModels={availableModels} />
    </div>
  );
}
