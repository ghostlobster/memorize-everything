<!--
Thanks for the PR! Please fill out every section below.
The `pr-hygiene` CI job will FAIL if the ticket reference is missing.
-->

## Summary

<!-- What does this change and why? Keep it to 2-4 sentences. -->

## Related ticket

<!--
REQUIRED. Link the GitHub issue or ticket this PR implements.
Use one of: Closes #123 | Fixes #123 | Resolves #123 | Refs #123
Multiple issues are fine. A PR without a ticket reference will be blocked by CI.
-->

Closes #

## Changes

<!-- Bullet list of the notable changes. -->

- 

## Test plan

<!-- How did you verify this change? Check each that applies. -->

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:coverage` passes; coverage thresholds met
- [ ] `pnpm build` succeeds
- [ ] (If UI changed) manually exercised the flow in `pnpm dev`
- [ ] (If schema changed) ran `pnpm db:generate` and committed the new migration
- [ ] (If prompts/schemas changed) regenerated a deck end-to-end via `pnpm smoke:deck`

## Screenshots / recordings

<!-- Drag + drop before/after screenshots or a short screen recording for UI changes. -->

## Checklist

- [ ] PR title follows Conventional Commits (`feat: …`, `fix: …`, etc.)
- [ ] Documentation updated (README / CONTRIBUTING) if behavior changed
- [ ] No secrets, `.env*` files, or large binary assets committed
- [ ] Breaking changes called out below

## Breaking changes

<!-- Describe any breaking API / schema / env var changes. Otherwise write "None". -->

None
