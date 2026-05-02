"use client";

import { useTransition, useState } from "react";
import { MoreHorizontal, PauseCircle, PlayCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelative } from "@/lib/utils";
import { suspendCardAction, unsuspendCardAction } from "@/server/actions/decks";
import { CardEditSheet } from "@/components/cards/card-edit-sheet";

export interface CardGridCard {
  id: string;
  front: string;
  back: string;
  whyItMatters: string | null;
  referenceSection: string | null;
  userNotes: string | null;
  suspended: boolean;
  repetition: number;
  ease: string | number;
  dueAt: Date;
}

interface CardGridProps {
  cards: CardGridCard[];
  now: number;
}

export function CardGrid({ cards, now }: CardGridProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggleSuspend(card: CardGridCard) {
    setPendingId(card.id);
    startTransition(async () => {
      try {
        if (card.suspended) {
          await unsuspendCardAction(card.id);
        } else {
          await suspendCardAction(card.id);
        }
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cards.map((c, idx) => (
        <Card
          key={c.id}
          className={c.suspended ? "h-full opacity-60" : "h-full"}
        >
          <CardHeader>
            <CardDescription className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span>Card {idx + 1}</span>
                {c.suspended && (
                  <Badge variant="secondary" className="text-xs">
                    Suspended
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {c.referenceSection && (
                  <Badge variant="outline" className="font-mono">
                    {c.referenceSection}
                  </Badge>
                )}
                <CardEditSheet card={c} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={pendingId === c.id}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      <span className="sr-only">Card actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleSuspend(c)}>
                      {c.suspended ? (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Unsuspend
                        </>
                      ) : (
                        <>
                          <PauseCircle className="mr-2 h-4 w-4" />
                          Suspend
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardDescription>
            <CardTitle className="text-base leading-snug">{c.front}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-sm">
            <p>{c.back}</p>
            {c.whyItMatters && (
              <p className="text-muted-foreground">{c.whyItMatters}</p>
            )}
            {c.userNotes && (
              <p className="italic text-muted-foreground">
                <span className="not-italic font-medium">My note:</span>{" "}
                {c.userNotes}
              </p>
            )}
            <div className="flex gap-3 pt-2 text-xs text-muted-foreground">
              <span>rep {c.repetition}</span>
              <span>ease {Number(c.ease).toFixed(2)}</span>
              <span>
                next{" "}
                {c.dueAt.getTime() <= now ? "now" : formatRelative(c.dueAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
