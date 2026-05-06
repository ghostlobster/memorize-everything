import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import {
  getOrCreatePet,
  listRecentPetEvents,
  renamePetAction,
} from "@/server/actions/pets";
import { PetSvg } from "@/components/pet/pet-svg";
import { PetStats } from "@/components/pet/pet-stats";
import { PetMemoryCard } from "@/components/pet/pet-memory-card";
import { personaFor } from "@/lib/pet/persona";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Your pet" };

export default async function PetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const pet = await getOrCreatePet(session.user.id);
  const events = await listRecentPetEvents(pet.id, 30);
  const persona = personaFor(pet.species);

  async function handleRename(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await renamePetAction(name);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-border bg-card p-3">
            <PetSvg
              species={pet.species}
              stage={pet.stage}
              mood={pet.mood}
              size={120}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {persona.label}
            </p>
            <h1 className="text-3xl font-semibold">{pet.name}</h1>
            <p className="text-sm text-muted-foreground">
              {pet.knowledgeMemoryUpdatedAt
                ? `Last learnt: ${pet.knowledgeMemoryUpdatedAt.toLocaleString()}`
                : "Hasn't finished a deck yet."}
            </p>
          </div>
        </div>
        <div className="w-full max-w-xs">
          <PetStats pet={pet} />
        </div>
      </header>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Rename
        </h2>
        <form action={handleRename} className="mt-2 flex gap-2">
          <input
            name="name"
            defaultValue={pet.name}
            maxLength={24}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="sm">
            Save
          </Button>
        </form>
      </section>

      <section id="memories" className="space-y-4">
        <h2 className="text-lg font-semibold">Pet memories</h2>
        <PetMemoryCard
          title="Knowledge memory"
          description="A compact digest of decks you've finished. Rebuilt automatically each time you complete a new deck."
          filename={`${pet.name}-knowledge.md`}
          content={pet.knowledgeMemory}
          updatedAt={pet.knowledgeMemoryUpdatedAt}
          defaultOpen
        />
        <PetMemoryCard
          title="Interaction memory"
          description="A summary of past chats. Compacts automatically when the recent buffer fills up."
          filename={`${pet.name}-interactions.md`}
          content={pet.interactionMemory}
          updatedAt={pet.interactionMemoryUpdatedAt}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
        <ol className="space-y-2 text-sm">
          {events.length === 0 && (
            <li className="text-muted-foreground">No activity yet.</li>
          )}
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-baseline gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <span className="w-32 shrink-0 font-mono text-xs uppercase text-muted-foreground">
                {e.kind}
              </span>
              <span className="flex-1 text-foreground/90">
                {describeEvent(e.kind, e.payload as Record<string, unknown>)}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {e.createdAt.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function describeEvent(
  kind: string,
  payload: Record<string, unknown>,
): string {
  switch (kind) {
    case "xp":
      return `+${payload.delta ?? 0} XP from ${payload.grade ?? "review"} on "${
        payload.topic ?? "?"
      }"`;
    case "levelup":
      return `Levelled up: ${payload.from ?? "?"} → ${payload.to ?? "?"}`;
    case "evolve":
      return `Evolved to stage ${payload.to ?? "?"}`;
    case "species_shift":
      return `Morphed: ${payload.from ?? "?"} → ${payload.to ?? "?"}`;
    case "rename":
      return `Renamed: "${payload.from ?? ""}" → "${payload.to ?? ""}"`;
    case "knowledge_rebuild":
      return `Knowledge memory rebuilt (${payload.deckCount ?? "?"} decks, ${
        payload.chars ?? "?"
      } chars)`;
    case "interaction_compact":
      return `Compacted ${payload.compactedCount ?? "?"} chat messages into memory`;
    default:
      return JSON.stringify(payload);
  }
}
