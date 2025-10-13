import { test, expect } from "@playwright/test";
import { gotoHome, clickFirstManualCard } from "./utils";

test.describe("Manueller Flow | Klick -> Pull -> Toast-Update", () => {
  test("Klick auf erste Karte aktualisiert Toast (Arm 1)", async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator("#manual-section")).toBeVisible();

    await clickFirstManualCard(page);

    // Erwartetes Muster durch App.vue („Manuell: Arm 1 …“)
    await expect(page.locator(".toast")).toContainText(/Manuell:\s*Arm\s*1/i, {
      timeout: 3000,
    });
  });
});
