"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { personaFor } from "@/lib/pet/persona";
import type { Pet } from "@/lib/db/schema";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function PetChatPanel({
  pet,
  initialMessages,
  initialQuestion,
  onClose,
}: {
  pet: Pet;
  initialMessages: ChatMessage[];
  initialQuestion?: string | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!initialQuestion) return initialMessages;
    return [
      ...initialMessages,
      {
        id: `q-${Date.now()}`,
        role: "assistant",
        content: initialQuestion,
      },
    ];
  });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persona = personaFor(pet.species);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(async () => {
    const content = draft.trim();
    if (!content || busy) return;
    setError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
    };
    const placeholder: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setDraft("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/pet/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Chat failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id ? { ...m, content: acc } : m,
          ),
        );
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages((prev) => prev.filter((m) => m.id !== placeholder.id));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [draft, busy, messages]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
      <header className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            {persona.emoji}
          </span>
          <div>
            <div className="text-sm font-medium leading-none">{pet.name}</div>
            <div className="text-xs text-muted-foreground">
              level {pet.level} · {persona.label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/pet#memories"
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Memories
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground">
            Say hi to {pet.name}.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-6 rounded-lg bg-primary/10 px-3 py-2"
                : "mr-6 rounded-lg bg-muted/60 px-3 py-2"
            }
          >
            {m.role === "assistant" ? (
              m.content ? (
                <MarkdownView>{m.content}</MarkdownView>
              ) : (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking…
                </span>
              )
            ) : (
              <span className="whitespace-pre-wrap">{m.content}</span>
            )}
          </div>
        ))}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border bg-background p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={`Ask ${pet.name} anything…`}
          rows={1}
          className="min-h-[36px] flex-1 resize-none rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
