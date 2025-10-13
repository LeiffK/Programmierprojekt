import { test, expect } from "@playwright/test";
import { gotoHome, ensureDebugState, clickFirstManualCard } from "./utils";

test.describe("Debug-Resilienz | Manuelle Interaktion bleibt funktionsfähig", () => {
  test("Manueller Flow funktioniert bei Debug=an und Debug=aus; Panel spiegelt Zustand", async ({
    page,
  }) => {
    await gotoHome(page);

    // Phase 1: Debug aus
    await ensureDebugState(page, false);
    await expect(page.locator("#manual-section")).toBeVisible();
    // Panel leer
    const offChildren = await page
      .locator("#debug-panel")
      .evaluate((el) => el.childElementCount);
    expect(offChildren).toBe(0);

    // Klick -> Toast aktualisiert
    await clickFirstManualCard(page);
    await expect(page.locator(".toast")).toContainText(/Manuell:\s*Arm\s*1/i, {
      timeout: 3000,
    });

    // Phase 2: Debug an
    await ensureDebugState(page, true);
    await expect(page.locator("#manual-section")).toBeVisible();

    // Panel zeigt Inhalt
    await expect
      .poll(async () =>
        page.locator("#debug-panel").evaluate((el) => el.childElementCount),
      )
      .toBeGreaterThan(0);

    // Erneuter Klick -> Toast aktualisiert wieder (keine Regression)
    await clickFirstManualCard(page);
    await expect(page.locator(".toast")).toContainText(/Manuell:\s*Arm\s*1/i, {
      timeout: 3000,
    });
  });
});
