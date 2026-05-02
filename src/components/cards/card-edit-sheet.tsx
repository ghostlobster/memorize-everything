"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { updateCardAction } from "@/server/actions/decks";

interface CardEditSheetProps {
  card: {
    id: string;
    front: string;
    back: string;
    whyItMatters: string | null;
    referenceSection: string | null;
    userNotes: string | null;
  };
}

export function CardEditSheet({ card }: CardEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [whyItMatters, setWhyItMatters] = useState(card.whyItMatters ?? "");
  const [referenceSection, setReferenceSection] = useState(card.referenceSection ?? "");
  const [userNotes, setUserNotes] = useState(card.userNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reset to current card values when reopening
      setFront(card.front);
      setBack(card.back);
      setWhyItMatters(card.whyItMatters ?? "");
      setReferenceSection(card.referenceSection ?? "");
      setUserNotes(card.userNotes ?? "");
      setError(null);
    }
    setOpen(next);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateCardAction(card.id, {
          front: front.trim(),
          back: back.trim(),
          whyItMatters: whyItMatters.trim() || undefined,
          referenceSection: referenceSection.trim() || undefined,
          userNotes: userNotes.trim() || undefined,
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" title="Edit card">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit card</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit card</SheetTitle>
          <SheetDescription>
            Update the card content. Changes apply immediately.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Front (question)</label>
            <Input
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="What is…?"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Back (answer)</label>
            <Textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Concise answer…"
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Why it matters <span className="font-normal">(optional)</span>
            </label>
            <Textarea
              value={whyItMatters}
              onChange={(e) => setWhyItMatters(e.target.value)}
              placeholder="Why it matters: …"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Reference section <span className="font-normal">(optional)</span>
            </label>
            <Input
              value={referenceSection}
              onChange={(e) => setReferenceSection(e.target.value)}
              placeholder="§1.2"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              My notes <span className="font-normal text-muted-foreground">(private)</span>
            </label>
            <Textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Personal memory aids, context, or reminders…"
              rows={3}
            />
          </div>
        </SheetBody>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={isPending || !front.trim() || !back.trim()}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
