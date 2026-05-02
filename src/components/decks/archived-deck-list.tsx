"use client";

import { ArchiveRestore } from "lucide-react";
import { DeckCard } from "@/components/decks/deck-selector-grid";
import type { DeckSummary } from "@/components/decks/deck-selector-grid";

export function ArchivedDeckList({ decks }: { decks: DeckSummary[] }) {
  if (decks.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ArchiveRestore className="h-4 w-4 shrink-0" />
        Archived
        <span className="ml-auto text-xs">{decks.length}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            isSelected={false}
            allGroups={[]}
            onToggle={() => {}}
          />
        ))}
      </div>
    </section>
  );
}
