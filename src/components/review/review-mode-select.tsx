import Link from "next/link";
import { ListChecks, PenLine, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReviewModeSelectProps {
  deckId: string;
  deckTopic: string;
  fullCount: number;
  criticalCount: number;
  /** Overrides the base href (used by multi-deck sessions) */
  fullHref?: string;
  criticalHref?: string;
}

export function ReviewModeSelect({
  deckId,
  deckTopic,
  fullCount,
  criticalCount,
  fullHref,
  criticalHref,
}: ReviewModeSelectProps) {
  const baseHref = `/decks/${deckId}/review`;
  const fullBase = fullHref ?? `${baseHref}?mode=full`;
  const critBase = criticalHref ?? `${baseHref}?mode=critical`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{deckTopic}</h1>
        <p className="text-muted-foreground">
          {fullCount} card{fullCount === 1 ? "" : "s"} due — how do you want to
          review?
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {/* Critical mode */}
        <Card className="relative flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-warning">
              <Zap className="h-4 w-4" />
              <CardTitle className="text-base">Critical</CardTitle>
            </div>
            <CardDescription>
              Struggling and lapsed cards only — sorted hardest first.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
            <Badge variant="warning" className="w-fit">
              {criticalCount} card{criticalCount === 1 ? "" : "s"}
            </Badge>
            <Button
              asChild={criticalCount > 0}
              disabled={criticalCount === 0}
              variant="warning"
              className="w-full"
            >
              {criticalCount > 0 ? (
                <Link href={critBase}>Start critical</Link>
              ) : (
                <span>No critical cards</span>
              )}
            </Button>
            {criticalCount > 0 && (
              <div className="flex gap-1.5">
                <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                  <Link href={`${critBase}-write`}>
                    <PenLine className="h-3 w-3" /> Write
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                  <Link href={`${critBase}-mc`}>A/B/C</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full mode */}
        <Card className="relative flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <ListChecks className="h-4 w-4" />
              <CardTitle className="text-base">Full review</CardTitle>
            </div>
            <CardDescription>
              All due cards in SM-2 order.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
            <Badge variant="secondary" className="w-fit">
              {fullCount} card{fullCount === 1 ? "" : "s"}
            </Badge>
            <Button asChild className="w-full">
              <Link href={fullBase}>Start full review</Link>
            </Button>
            <div className="flex gap-1.5">
              <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                <Link href={`${fullBase}-write`}>
                  <PenLine className="h-3 w-3" /> Write
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                <Link href={`${fullBase}-mc`}>A/B/C</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
