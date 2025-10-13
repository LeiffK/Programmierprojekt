import { test, expect } from "@playwright/test";
import { gotoHome, switchToAlgoMode, switchToManualMode } from "./utils";

test.describe("Moduswechsel | Manual ↔ Algo", () => {
  test("Wechsel von Manual zu Algo und zurück", async ({ page }) => {
    await gotoHome(page);

    // Default: Manual sichtbar
    await expect(page.locator("#manual-section")).toBeVisible();

    // → Algo
    await switchToAlgoMode(page);
    await expect(page.locator("#runner-controls")).toBeVisible();
    await expect(page.locator("#manual-section")).toHaveCount(0);

    // → Manual
    await switchToManualMode(page);
    await expect(page.locator("#manual-section")).toBeVisible();
  });
});
