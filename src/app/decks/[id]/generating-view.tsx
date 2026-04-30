"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = "loading" | "error";

export function GeneratingDeckView({
  deckId,
  topic,
  initialError,
}: {
  deckId: string;
  topic: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>(initialError ? "error" : "loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ?? null,
  );
  const started = useRef(false);

  async function runGeneration() {
    setState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/decks/${deckId}/generate`, {
        method: "POST",
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setErrorMessage(json.error ?? "Generation failed — please try again.");
        setState("error");
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage("Network error — please check your connection and retry.");
      setState("error");
    }
  }

  useEffect(() => {
    if (started.current || initialError) return;
    started.current = true;
    void runGeneration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "error") {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Generation failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <Button variant="outline" onClick={() => void runGeneration()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{topic}</h1>
        <div className="flex flex-wrap gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      </header>

      <div className="flex items-start gap-3 text-muted-foreground">
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Synthesizing your learning module…
          </p>
          <p className="text-xs">
            Building knowledge graph, flashcards, and mnemonics. Usually takes
            20–60 seconds.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
