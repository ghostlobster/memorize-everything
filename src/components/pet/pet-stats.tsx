import Link from "next/link";
import { progressInLevel } from "@/lib/pet/xp";
import { personaFor } from "@/lib/pet/persona";
import type { Pet } from "@/lib/db/schema";

export function PetStats({
  pet,
  compact = false,
}: {
  pet: Pet;
  compact?: boolean;
}) {
  const persona = personaFor(pet.species);
  const p = progressInLevel(pet.xp);

  if (compact) {
    return (
      <Link
        href="/pet"
        className="hidden items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground sm:flex"
        title={`${pet.name} · level ${pet.level} · ${p.xpInLevel}/${p.xpNeeded} XP`}
      >
        <span aria-hidden>{persona.emoji}</span>
        <span className="font-medium text-foreground">{pet.name}</span>
        <span className={`font-mono ${persona.paletteClass}`}>L{pet.level}</span>
        <span className="relative h-1 w-12 overflow-hidden rounded-full bg-muted">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${p.percent}%` }}
          />
        </span>
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm uppercase tracking-wide text-muted-foreground">
            Level
          </div>
          <div className="text-3xl font-bold tabular-nums">{pet.level}</div>
        </div>
        <div className="text-right">
          <div className="text-sm uppercase tracking-wide text-muted-foreground">
            Stage
          </div>
          <div className="text-3xl font-bold tabular-nums">{pet.stage}</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{p.xpInLevel} / {p.xpNeeded} XP</span>
          <span>{pet.xp} total</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${p.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
