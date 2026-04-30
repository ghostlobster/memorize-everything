import { expect, test } from "@playwright/test";
import { signInAsE2EUser } from "./support/auth";
import {
  E2E_CARDS,
  E2E_DECK_ID,
  E2E_DECK_TOPIC,
} from "./support/fixtures";

/**
 * Diagnostic helper used while #19 stabilises. Logs key page state
 * to stdout (which the GitHub Actions reporter surfaces in the run
 * log) so failures don't have to be debugged blind.
 */
async function logPageState(page: import("@playwright/test").Page, label: string) {
  console.log(
    `\n[diag:${label}] url=${page.url()}\n` +
      `[diag:${label}] title=${await page.title()}\n` +
      `[diag:${label}] cookies=${
        (await page.context().cookies())
          .map((c) => `${c.name}=${c.value.slice(0, 12)}…`)
          .join("; ") || "<none>"
      }\n` +
      `[diag:${label}] body[0..400]=${
        ((await page.locator("body").textContent()) ?? "")
          .replace(/\s+/g, " ")
          .slice(0, 400)
      }\n`,
  );
}

test.describe("authenticated golden path", () => {
  test("deck view → review → grade Right advances to next card", async ({ page }) => {
    // First visit sets the cookie's domain context, then plant the
    // seeded session cookie so middleware lets us past /decks/*.
    await page.goto("/");
    await signInAsE2EUser(page);
    await logPageState(page, "after-cookie-plant");

    // Verify the server's DB has the seeded rows BEFORE we try to
    // navigate to a protected route. If counts are zero the seed
    // didn't reach the server's pglite instance and no auth fix
    // can save the spec; if counts look right the failure is
    // downstream (cookie / Auth.js).
    const debug = await page.request.get("/api/e2e-debug");
    const debugBody = await debug.text();
    console.log(
      `[diag:db] status=${debug.status()} body=${debugBody}`,
    );
    // Embed the body in the assertion message so the GH Actions
    // annotation surfaces it even when stdout doesn't reach us.
    expect(
      debug.status(),
      `expected /api/e2e-debug 200; got ${debug.status()} body=${debugBody}`,
    ).toBe(200);
    expect(
      debugBody,
      `seed not reaching server; body=${debugBody}`,
    ).toContain('"users":1');
    expect(
      debugBody,
      `session row missing; body=${debugBody}`,
    ).toContain('"sessions":1');

    // --- Deck view ----------------------------------------------------
    await page.goto(`/decks/${E2E_DECK_ID}`);
    await logPageState(page, "after-deck-goto");

    // If middleware redirected us back to "/" the cookie did not
    // authenticate; fail loudly with the actual landing URL rather
    // than a generic "element not found" timeout 15s later.
    await expect(page, "deck route should not redirect to /").toHaveURL(
      new RegExp(`/decks/${E2E_DECK_ID}$`),
    );

    await expect(
      // The deck page renders the topic in two h1s — once in the
      // page header and once at the top of the markdown body.
      // Both are correct; we only need to confirm at least one.
      page.getByRole("heading", { name: E2E_DECK_TOPIC }).first(),
    ).toBeVisible();
    await expect(page.getByText("5 cards")).toBeVisible();
    await expect(page.getByText("5 due")).toBeVisible();

    // --- Start review -------------------------------------------------
    await page.getByRole("link", { name: /start review/i }).click();
    await expect(page).toHaveURL(new RegExp(`/decks/${E2E_DECK_ID}/review$`));

    const firstCard = E2E_CARDS[0]!;
    const secondCard = E2E_CARDS[1]!;

    await expect(page.getByText(firstCard.front)).toBeVisible();
    await expect(page.getByText("5 due")).toBeVisible();

    // --- Flip + grade Right (keyboard path) ---------------------------
    await page.keyboard.press(" ");
    await expect(page.getByText(firstCard.back)).toBeVisible();
    await page.keyboard.press("3");

    await expect(page.getByText(secondCard.front)).toBeVisible();
    await expect(page.getByText("4 due")).toBeVisible();
  });
});
