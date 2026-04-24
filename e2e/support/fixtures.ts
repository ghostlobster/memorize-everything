/**
 * Shared constants for the E2E test harness.
 *
 * These are deliberately exported from a small module so they stay in
 * sync between:
 *   - scripts/seed-e2e.ts (seeds the DB)
 *   - e2e/support/auth.ts (plants the session cookie)
 *   - e2e/golden-path.spec.ts (asserts on the seeded deck)
 *
 * None of these values are used in production code paths.
 */
export const E2E_USER_ID = "e2e-user";
export const E2E_USER_EMAIL = "e2e@test.local";
export const E2E_USER_NAME = "E2E User";

/** Session cookie value; Auth.js expects a 64-hex-char-ish string but
 * accepts any opaque token against its database adapter. */
export const E2E_SESSION_TOKEN =
  "e2e-session-token-0000000000000000000000000000000000000000000000";

/** Auth.js v5 default cookie name (non-secure, HTTP). */
export const E2E_SESSION_COOKIE = "authjs.session-token";

export const E2E_DECK_TOPIC = "Transformer attention";
export const E2E_DECK_ID = "00000000-0000-0000-0000-0000000000e2";

/** Front / back text for the 5 seeded cards. Keep short so UI
 * assertions stay readable. */
export const E2E_CARDS: Array<{ front: string; back: string }> = [
  { front: "Q1: What does attention compute?", back: "A1: A weighted sum of value vectors." },
  { front: "Q2: What are Q, K, V?", back: "A2: Learned linear projections of the input." },
  { front: "Q3: Why scale by √d?", back: "A3: To keep softmax inputs in a stable range." },
  { front: "Q4: What is a head?", back: "A4: An independent attention subspace." },
  { front: "Q5: Causal mask?", back: "A5: Prevents attending to future positions." },
];
