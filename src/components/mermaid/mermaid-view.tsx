"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeMermaid } from "@/lib/ai/mermaid";

/**
 * Client-only Mermaid renderer. Mermaid pulls in DOM APIs so it cannot run
 * during SSR — we dynamically import it on mount.
 */
export function MermaidView({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          fontFamily: "var(--font-sans)",
        });
        const id = `mmd-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, normalizeMermaid(source));
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Could not render diagram</span>
        </div>
        <p className="text-muted-foreground">{error}</p>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSource((v) => !v)}
          >
            {showSource ? "Hide source" : "Show source"}
          </Button>
        </div>
        {showSource && (
          <pre className="mt-3 max-h-96 overflow-auto rounded bg-muted p-3 text-xs">
            {source}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card p-4">
      <div ref={ref} className="mermaid-container flex justify-center" />
    </div>
  );
}
