import { test, expect } from "@playwright/test";
import { gotoHome, ensureDebugState } from "./utils";

test.describe("Debug-Panel | Sichtbarkeit an/aus", () => {
  test("Debug-Panel rendert nur bei Debug=an", async ({ page }) => {
    await gotoHome(page);

    // Aus: Panel-Container existiert, aber ohne Inhalt
    await ensureDebugState(page, false);
    const childCountOff = await page
      .locator("#debug-panel")
      .evaluate((el) => el.childElementCount);
    expect(childCountOff).toBe(0);

    // An: Mindestens ein Kind-Element vorhanden
    await ensureDebugState(page, true);
    await expect
      .poll(async () =>
        page.locator("#debug-panel").evaluate((el) => el.childElementCount),
      )
      .toBeGreaterThan(0);
  });
});
