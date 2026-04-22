import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <h2 className="text-lg font-semibold">Synthesizing your module…</h2>
      <p className="text-sm text-muted-foreground">
        Writing the Feynman deep-dive, building the knowledge graph, generating
        flashcards + mnemonics. This usually takes 20–60 seconds.
      </p>
    </div>
  );
}
