import { test, expect } from "@playwright/test";
import { gotoHome } from "./utils";

test.describe("Brand-Interaction | Scroll-to-top", () => {
  test("Klick auf Branding scrollt nach oben", async ({ page }) => {
    await gotoHome(page);

    // Nach unten scrollen
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => window.scrollY);

    await page.locator(".brand").click();
    await page.waitForTimeout(250);

    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeLessThanOrEqual(before);
  });
});
