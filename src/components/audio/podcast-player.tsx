"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { stripMarkdown } from "@/lib/tts/strip-markdown";

interface PlayerCard {
  front: string;
  back: string;
  whyItMatters: string | null;
}

type Segment = "front" | "back" | "why";

const DRILL_PAUSE_MS = 5000;
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

function buildSegments(card: PlayerCard, sub: "synthesis" | "drill"): { segment: Segment; text: string }[] {
  const segs: { segment: Segment; text: string }[] = [];
  if (sub === "synthesis") {
    segs.push({ segment: "front", text: card.front });
    segs.push({ segment: "back", text: card.back });
    if (card.whyItMatters) segs.push({ segment: "why", text: card.whyItMatters });
  } else {
    segs.push({ segment: "front", text: card.front });
    segs.push({ segment: "back", text: card.back });
  }
  return segs;
}

export function PodcastPlayer({
  cards,
  deckTopic,
  sub,
}: {
  cards: PlayerCard[];
  deckTopic: string;
  sub: "synthesis" | "drill";
}) {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [playing, setPlaying] = useState(false);
  const [cardIdx, setCardIdx] = useState(0);
  const [segIdx, setSegIdx] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const drillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supported) return;
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported]);

  const currentCard = cards[cardIdx];
  const segments = currentCard ? buildSegments(currentCard, sub) : [];
  const currentSegment = segments[segIdx];

  const speak = useCallback(
    (text: string, onEnd: () => void) => {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(stripMarkdown(text));
      utt.rate = speed;
      if (voices[voiceIdx]) utt.voice = voices[voiceIdx]!;
      utt.onend = onEnd;
      utt.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utt);
    },
    [speed, voices, voiceIdx],
  );

  const advanceSegment = useCallback(() => {
    setSegIdx((prev) => {
      const next = prev + 1;
      if (next < segments.length) return next;
      // Move to next card
      setCardIdx((ci) => {
        if (ci + 1 < cards.length) {
          setSegIdx(0);
          return ci + 1;
        }
        setPlaying(false);
        return ci;
      });
      return 0;
    });
  }, [segments.length, cards.length]);

  // Drive playback
  useEffect(() => {
    if (!playing || !currentSegment) return;

    if (sub === "drill" && currentSegment.segment === "back") {
      // In drill mode, pause before reading the answer
      drillTimerRef.current = setTimeout(() => {
        speak(currentSegment.text, advanceSegment);
      }, DRILL_PAUSE_MS);
      return () => {
        if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
      };
    }

    speak(currentSegment.text, advanceSegment);
    return () => {
      window.speechSynthesis.cancel();
      if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
    };
  }, [playing, currentSegment, sub, speak, advanceSegment]);

  const togglePlay = useCallback(() => {
    if (playing) {
      window.speechSynthesis.cancel();
      if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }, [playing]);

  const goToCard = useCallback(
    (idx: number) => {
      window.speechSynthesis.cancel();
      if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
      setCardIdx(idx);
      setSegIdx(0);
    },
    [],
  );

  const segmentLabel: Record<Segment, string> = {
    front: "Question",
    back: sub === "drill" ? "Answer (pausing…)" : "Answer",
    why: "Why it matters",
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not supported</CardTitle>
          <CardDescription>
            Your browser does not support the Web Speech API. Try Chrome or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current card display */}
      <Card className="min-h-[200px]">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5" />
            {currentSegment ? segmentLabel[currentSegment.segment] : "Done"}
            <span className="ml-auto text-xs font-mono">
              {cardIdx + 1} / {cards.length}
            </span>
          </CardDescription>
          <CardTitle className="text-xl leading-snug">
            {currentCard?.front}
          </CardTitle>
        </CardHeader>
        {currentSegment?.segment !== "front" && (
          <CardContent className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap text-base">{currentCard?.back}</p>
            {currentCard?.whyItMatters && sub === "synthesis" && (
              <p className="text-muted-foreground">{currentCard.whyItMatters}</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-1 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${cards.length > 0 ? ((cardIdx + (segIdx / Math.max(segments.length, 1))) / cards.length) * 100 : 0}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToCard(Math.max(0, cardIdx - 1))}
          disabled={cardIdx === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button size="lg" onClick={togglePlay} className="w-24">
          {playing ? (
            <><Pause className="h-5 w-5" /> Pause</>
          ) : (
            <><Play className="h-5 w-5" /> Play</>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => goToCard(Math.min(cards.length - 1, cardIdx + 1))}
          disabled={cardIdx >= cards.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Speed + voice */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Speed:</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {voices.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Voice:</span>
            <select
              value={voiceIdx}
              onChange={(e) => setVoiceIdx(Number(e.target.value))}
              className="rounded border border-input bg-background px-2 py-0.5 text-xs"
            >
              {voices.map((v, i) => (
                <option key={i} value={i}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {sub === "drill" && (
        <p className="text-center text-xs text-muted-foreground">
          Drill mode — question is read, then a {DRILL_PAUSE_MS / 1000}s pause before the answer.
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {deckTopic} · {cards.length} card{cards.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
