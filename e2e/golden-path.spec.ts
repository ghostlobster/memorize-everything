import { expect, test } from "@playwright/test";
import { signInAsE2EUser } from "./support/auth";
import {
  E2E_CARDS,
  E2E_DECK_ID,
  E2E_DECK_TOPIC,
} from "./support/fixtures";

test.describe("authenticated golden path", () => {
  test("deck view → review → grade Right advances to next card", async ({ page }) => {
    // Extend timeout: gradeCardAction uses pglite which is slower than Neon
    // in CI; 60 s gives comfortable headroom for 3+ DB round-trips.
    test.setTimeout(60_000);

    // First visit sets the cookie's domain context, then plant the
    // seeded session cookie so middleware lets us past /decks/*.
    await page.goto("/");
    await signInAsE2EUser(page);

    // --- Deck view ----------------------------------------------------
    await page.goto(`/decks/${E2E_DECK_ID}`);

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
    // Mode selection screen: choose Full review (Feature 5)
    await expect(page).toHaveURL(new RegExp(`/decks/${E2E_DECK_ID}/review$`));
    await page.getByRole("link", { name: /start full review/i }).click();
    await expect(page).toHaveURL(new RegExp(`/decks/${E2E_DECK_ID}/review.*mode=full`));
    // Client-side navigation is fast, so React's useEffect (which wires up
    // keyboard shortcuts) may not have run by the time Playwright finds the
    // SSR-painted DOM.  ReviewSession sets data-testid="review-ready" inside
    // a useEffect that fires after the keyboard handler, giving us a reliable
    // signal that the component is fully hydrated and interactive.
    await page.locator('[data-testid="review-ready"]').waitFor({ timeout: 15_000 });

    const firstCard = E2E_CARDS[0]!;
    const secondCard = E2E_CARDS[1]!;

    await expect(page.getByText(firstCard.front)).toBeVisible();
    await expect(page.getByText("5 due")).toBeVisible();

    // --- Flip + grade Right (keyboard path) ---------------------------
    await page.keyboard.press(" ");
    await expect(page.getByText(firstCard.back)).toBeVisible();
    await page.keyboard.press("3");

    // gradeCardAction writes to the DB then client advances the queue.
    // Allow up to 30 s: pglite in CI does auth lookup + card update +
    // review insert sequentially and can be slow on shared runners.
    // On failure Playwright captures a screenshot; any [data-testid=grade-error]
    // banner visible there indicates a server-action exception.
    await expect(page.getByText(secondCard.front)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("4 due")).toBeVisible();
  });
});
