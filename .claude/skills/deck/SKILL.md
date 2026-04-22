---
name: deck
description: Smoke-test the AI deck generation pipeline end-to-end for a given topic, then validate the output against DeckPayloadSchema. Required after any edit to src/lib/ai/prompts.ts or src/lib/ai/schemas.ts (those files are excluded from unit-test coverage). Use when the user says /deck, "smoke test the generator", or after prompt/schema edits.
---

# /deck — end-to-end generation smoke test

`src/lib/ai/generate-deck.ts` and `prime-card.ts` are thin wrappers
around the Vercel AI SDK and are excluded from unit-test coverage.
This skill exercises them against a real provider so prompt or
schema regressions surface before CI.

## Procedure

1. **Pick a topic.** If the user supplied one, use it. Otherwise
   pick one from the rotation:
   - "AI Engineering" (broad, conceptual)
   - "Transformer attention" (math + diagrams)
   - "Byzantine fault tolerance" (distributed systems)
   - "Bayesian inference" (probability + LaTeX)
   - "Krebs cycle" (biology, exercises interleaving suggestion)

2. **Run the smoke script:**
   ```bash
   pnpm smoke:deck "<topic>"
   ```
   This calls `generateDeck({ topic, level: 'intermediate',
   goal: 'mastery' })` and prints the markdown + mermaid + cards.

3. **Validate the output** against `DeckPayloadSchema` in
   `src/lib/ai/schemas.ts`. Check manually:
   - 8–20 cards (schema-enforced, but verify the count is
     reasonable for the topic).
   - Every `card.referenceSection` value actually appears in the
     Phase 1 markdown as a heading. Mismatches = stale refs.
   - Mermaid starts with `flowchart` or `graph` (no stray fences).
   - At least one mnemonic with both `name` and `device`.
   - An interleaving suggestion with both `topic` and `reason`.

4. **Report** findings in order: model used, generation time,
   card count, any schema violations, any suspicious content
   (made-up section refs, empty whyItMatters fields, broken
   mermaid).

## When NOT to run /deck

- No prompt or schema edits and the user didn't ask — don't
  spend API credits defensively.
- `GOOGLE_GENERATIVE_AI_API_KEY` (or the configured provider's
  key) missing from `.env.local` — bail early with the env var
  name.

## Cost note

A single generation is roughly 30–60s and a few cents of API
spend depending on the default provider. Don't loop.
