"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeckActions } from "@/components/decks/deck-actions";
import { formatRelative } from "@/lib/utils";

interface DeckSummary {
  id: string;
  topic: string;
  level: string;
  goal: string;
  status: string;
  createdAt: Date;
  modelId: string | null;
  cardCount: number;
  dueCount: number;
}

export function DeckSelectorGrid({ decks }: { decks: DeckSummary[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedDueCount = decks
    .filter((d) => selected.has(d.id))
    .reduce((n, d) => n + d.dueCount, 0);

  const sessionHref = `/review/multi?decks=${[...selected].join(",")}`;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {decks.map((deck) => {
          const isSelected = selected.has(deck.id);
          return (
            <Card
              key={deck.id}
              className={`relative h-full transition-colors hover:border-primary/50 hover:bg-accent/40 ${
                isSelected ? "border-primary/60 bg-accent/30 ring-1 ring-primary/30" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="leading-snug">
                    <Link
                      href={`/decks/${deck.id}`}
                      className="after:absolute after:inset-0"
                    >
                      {deck.topic}
                    </Link>
                  </CardTitle>
                  <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-1">
                    {deck.status === "generating" && (
                      <Badge variant="secondary">Generating…</Badge>
                    )}
                    {deck.status === "failed" && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                    {deck.dueCount > 0 && (
                      <Badge variant="warning">{deck.dueCount} due</Badge>
                    )}
                    {/* Checkbox — z-10 so it sits above the card link overlay */}
                    {deck.dueCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggle(deck.id);
                        }}
                        aria-label={
                          isSelected
                            ? `Deselect ${deck.topic}`
                            : `Select ${deck.topic} for session`
                        }
                        className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background hover:border-primary"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>
                    )}
                    <DeckActions deckId={deck.id} isArchived={false} />
                  </div>
                </div>
                <CardDescription className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">{deck.level}</Badge>
                  <Badge variant="secondary">{deck.goal}</Badge>
                  <Badge variant="outline">{deck.cardCount} cards</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created {formatRelative(deck.createdAt)}</span>
                {deck.modelId && (
                  <span className="font-mono">{deck.modelId}</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sticky session bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="flex items-center gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <span className="text-sm text-muted-foreground">
              {selectedDueCount} card{selectedDueCount !== 1 ? "s" : ""} due ·{" "}
              {selected.size} deck{selected.size !== 1 ? "s" : ""}
            </span>
            <Button asChild size="sm" disabled={selectedDueCount === 0}>
              <Link href={sessionHref}>
                <Play className="h-3.5 w-3.5" />
                Start session
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
