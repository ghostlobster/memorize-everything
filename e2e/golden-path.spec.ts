import { expect, test } from "@playwright/test";
import { signInAsE2EUser } from "./support/auth";
import {
  E2E_CARDS,
  E2E_DECK_ID,
  E2E_DECK_TOPIC,
} from "./support/fixtures";

test.describe("authenticated golden path", () => {
  test("deck view → review → grade Right advances to next card", async ({ page }) => {
    // First visit sets the cookie's domain context, then plant the
    // seeded session cookie so middleware lets us past /decks/*.
    await page.goto("/");
    await signInAsE2EUser(page);

    // --- Deck view ----------------------------------------------------
    await page.goto(`/decks/${E2E_DECK_ID}`);
    await expect(
      page.getByRole("heading", { name: E2E_DECK_TOPIC }),
    ).toBeVisible();
    await expect(page.getByText("5 cards")).toBeVisible();
    await expect(page.getByText("5 due")).toBeVisible();

    // --- Start review -------------------------------------------------
    await page.getByRole("link", { name: /start review/i }).click();
    await expect(page).toHaveURL(new RegExp(`/decks/${E2E_DECK_ID}/review$`));

    // First card's front matches the seeded fixture (orderIdx 0).
    // Due-ordering is ties broken by orderIdx ascending.
    const firstCard = E2E_CARDS[0]!;
    const secondCard = E2E_CARDS[1]!;

    await expect(
      page.getByRole("heading", { name: firstCard.front }),
    ).toBeVisible();
    await expect(page.getByText("5 due")).toBeVisible();

    // --- Flip + grade Right (keyboard path) ---------------------------
    // Space flips the card; `3` is the Right shortcut per the review
    // session keymap. On Right the client grades server-side and
    // advances immediately; the card count drops by one and the next
    // due card appears.
    await page.keyboard.press(" ");
    await expect(page.getByText(firstCard.back)).toBeVisible();
    await page.keyboard.press("3");

    await expect(
      page.getByRole("heading", { name: secondCard.front }),
    ).toBeVisible();
    await expect(page.getByText("4 due")).toBeVisible();
  });
});
