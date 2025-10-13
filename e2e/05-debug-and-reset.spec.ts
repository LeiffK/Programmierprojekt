import { test, expect } from "@playwright/test";
import { clearBrowserData } from "./helpers";

test.describe("Debug-Modus und Reset", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserData(page);
    await page.waitForLoadState("networkidle");
  });

  test("sollte Debug-Modus umschalten können", async ({ page }) => {
    // Verwende spezifischeren Selektor für den Debug-Button im Header
    const debugBtn = page
      .locator(".bar-actions")
      .getByRole("button", { name: /debug/i });

    // Initial sollte Debug aus sein
    let classes = await debugBtn.getAttribute("class");
    expect(classes).not.toContain("btn-primary");

    // Aktiviere Debug
    await debugBtn.click();
    await page.waitForTimeout(300);

    classes = await debugBtn.getAttribute("class");
    expect(classes).toContain("btn-primary");

    // Debug Panel sollte sichtbar sein
    const debugPanel = page.locator("#debug-panel");
    await expect(debugPanel).toBeVisible();
  });

  test("sollte Reset-Modal öffnen", async ({ page }) => {
    const resetBtn = page
      .getByRole("button", { name: /zurücksetzen/i })
      .first();
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Modal sollte sichtbar sein
    const modal = page.locator(".modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Zurücksetzen bestätigen");
    await expect(modal).toContainText(
      "Alle Daten und Einstellungen gehen verloren",
    );
  });

  test("sollte Reset abbrechen können", async ({ page }) => {
    // Öffne Reset-Modal
    const resetBtn = page
      .getByRole("button", { name: /zurücksetzen/i })
      .first();
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Modal sollte sichtbar sein
    let modal = page.locator(".modal");
    await expect(modal).toBeVisible();

    // Klicke Abbrechen
    const cancelBtn = page.getByRole("button", { name: /abbrechen/i });
    await cancelBtn.click();
    await page.waitForTimeout(300);

    // Modal sollte geschlossen sein
    modal = page.locator(".modal");
    await expect(modal).not.toBeVisible();
  });

  test("sollte Reset-Modal mit ESC schließen", async ({ page }) => {
    // Öffne Reset-Modal
    const resetBtn = page
      .getByRole("button", { name: /zurücksetzen/i })
      .first();
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Drücke ESC
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Modal sollte geschlossen sein
    const modal = page.locator(".modal");
    await expect(modal).not.toBeVisible();
  });
});
