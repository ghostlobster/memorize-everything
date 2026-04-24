import type { Page } from "@playwright/test";
import { E2E_SESSION_COOKIE, E2E_SESSION_TOKEN } from "./fixtures";

/**
 * Plant the seeded Auth.js session cookie on a Playwright page so
 * subsequent navigation passes the middleware guard on /decks/* and
 * /review. The matching session row must already exist in the
 * pglite DB (seeded by scripts/seed-e2e.ts).
 *
 * This deliberately does NOT modify production auth code. The cookie
 * name (`authjs.session-token`) is the Auth.js v5 default for
 * non-secure HTTP — which is what Playwright's webServer serves on
 * localhost:3000.
 */
export async function signInAsE2EUser(page: Page): Promise<void> {
  const url = new URL(page.url() === "about:blank" ? "http://localhost:3000" : page.url());
  await page.context().addCookies([
    {
      name: E2E_SESSION_COOKIE,
      value: E2E_SESSION_TOKEN,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      // Match the 30-day expiry used by the seed script.
      expires: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
    },
  ]);
}
