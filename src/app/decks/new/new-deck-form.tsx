"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDeckAction } from "@/server/actions/decks";

const LEVELS = [
  { value: "novice", label: "Novice" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const GOALS = [
  { value: "overview", label: "Overview" },
  { value: "exam", label: "Exam-ready" },
  { value: "mastery", label: "Mastery" },
  { value: "research", label: "Research-grade" },
];

type AvailableModel = { provider: string; modelId: string; label: string };

export function NewDeckForm({
  availableModels,
}: {
  availableModels: AvailableModel[];
}) {
  const [state, formAction] = useActionState(createDeckAction, null);
  const [level, setLevel] = useState("intermediate");
  const [goal, setGoal] = useState("mastery");
  const [model, setModel] = useState<AvailableModel>(
    availableModels[0] ?? { provider: "", modelId: "", label: "" },
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="topic" className="text-sm font-medium">
              What do you want to master?
            </label>
            <Input
              id="topic"
              name="topic"
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. Transformer attention, Bayesian inference, AI Engineering"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your level</label>
              <input type="hidden" name="level" value={level} />
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <Button
                    key={l.value}
                    type="button"
                    size="sm"
                    variant={level === l.value ? "default" : "outline"}
                    onClick={() => setLevel(l.value)}
                  >
                    {l.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Goal depth</label>
              <input type="hidden" name="goal" value={goal} />
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <Button
                    key={g.value}
                    type="button"
                    size="sm"
                    variant={goal === g.value ? "default" : "outline"}
                    onClick={() => setGoal(g.value)}
                  >
                    {g.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="scope" className="text-sm font-medium">
              Scope / constraints{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="scope"
              name="scope"
              maxLength={500}
              placeholder="e.g. focus on encoder-only models, skip historical context, must cover attention math"
            />
          </div>

          {availableModels.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <input type="hidden" name="provider" value={model.provider} />
              <input type="hidden" name="modelId" value={model.modelId} />
              <div className="flex flex-wrap gap-2">
                {availableModels.map((m) => (
                  <Button
                    key={`${m.provider}:${m.modelId}`}
                    type="button"
                    size="sm"
                    variant={model.modelId === m.modelId ? "default" : "outline"}
                    onClick={() => setModel(m)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating deck…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate deck
        </>
      )}
    </Button>
  );
}
