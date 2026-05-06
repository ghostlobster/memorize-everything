"use client";

import { useState } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { Button } from "@/components/ui/button";

export function PetMemoryCard({
  title,
  description,
  filename,
  content,
  updatedAt,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  filename: string;
  content: string;
  updatedAt: Date | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleDownload = () => {
    const blob = new Blob([content || `# ${title}\n\n(empty)\n`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">
            {updatedAt
              ? `updated ${updatedAt.toLocaleString()}`
              : "not yet generated"}
          </span>
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!content}
        >
          <Download className="h-4 w-4" />
          .md
        </Button>
      </header>
      <p className="px-4 pt-3 text-xs text-muted-foreground">{description}</p>
      {open && (
        <div className="px-4 pb-4 pt-2">
          {content ? (
            <MarkdownView>{content}</MarkdownView>
          ) : (
            <p className="text-sm text-muted-foreground">
              Empty for now — finish a deck (or chat with your pet a few
              times) and this will fill in.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
