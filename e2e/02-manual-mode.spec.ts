import { test, expect } from "@playwright/test";
import { clearBrowserData } from "./helpers";

test.describe("Manueller Modus", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserData(page);
    await page.waitForLoadState("networkidle");
  });

  test("sollte manuellen Modus anzeigen", async ({ page }) => {
    // Der manuelle Modus sollte standardmäßig aktiv sein
    const manualSection = page.locator("#manual-section");
    await expect(manualSection).toBeVisible();
    await expect(manualSection).toContainText("Manuell testen");

    // Prüfe ob Thumbnails vorhanden sind
    const thumbnails = page.locator(".thumb-grid > *");
    const count = await thumbnails.count();
    expect(count).toBeGreaterThan(0);
  });

  test("sollte Thumbnail-Klick registrieren", async ({ page }) => {
    // Klicke auf erstes Thumbnail
    const thumbnails = page.locator(".thumb-grid > *");
    await thumbnails.first().click();
    await page.waitForTimeout(500);

    // Prüfe ob Toast aktualisiert wurde
    const toast = page.locator(".toast");
    const toastText = await toast.textContent();
    expect(toastText).toContain("Manuell");
    expect(toastText).toContain("Arm");
  });

  test("sollte zwischen Modi wechseln können", async ({ page }) => {
    // Standardmäßig im manuellen Modus
    let manualSection = page.locator("#manual-section");
    await expect(manualSection).toBeVisible();

    // Wechsel zu Algorithmus-Modus
    const modeSwitch = page.locator("#mode-switch");
    const algoBtn = modeSwitch
      .locator("button")
      .filter({ hasText: "Algorithmus" });
    await algoBtn.click();
    await page.waitForTimeout(500);

    // Manueller Bereich sollte versteckt sein
    await expect(manualSection).not.toBeVisible();

    // Runner Controls sollten sichtbar sein
    const runnerControls = page.locator("#runner-controls");
    await expect(runnerControls).toBeVisible();

    // Zurück zum manuellen Modus
    const manualBtn = modeSwitch
      .locator("button")
      .filter({ hasText: "Manuell" });
    await manualBtn.click();
    await page.waitForTimeout(500);

    await expect(manualSection).toBeVisible();
  });
});
