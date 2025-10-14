import { test, expect } from "@playwright/test";
import { clearBrowserData, waitForChart } from "./helpers";

test.describe("Chart-Visualisierung", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserData(page);
    await page.waitForLoadState("networkidle");
    await waitForChart(page);
  });

  test("sollte Chart mit Canvas rendern", async ({ page }) => {
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const chartArea = page.locator("#chart-area");
    await expect(chartArea).toContainText("Verläufe");
  });

  test("sollte zwischen Metriken wechseln können", async ({ page }) => {
    // Standard ist "Σ Reward"
    let activeMetric = page.locator(".pill.metric.active");
    await expect(activeMetric).toContainText("Σ Reward");

    // Wechsel zu "Ø Reward"
    const avgRewardBtn = page
      .locator(".pill.metric")
      .filter({ hasText: "Ø Reward" });
    await avgRewardBtn.click();
    await page.waitForTimeout(300);

    activeMetric = page.locator(".pill.metric.active");
    await expect(activeMetric).toContainText("Ø Reward");

    // Wechsel zu "Best-Quote"
    const bestRateBtn = page
      .locator(".pill.metric")
      .filter({ hasText: "Best-Quote" });
    await bestRateBtn.click();
    await page.waitForTimeout(300);

    activeMetric = page.locator(".pill.metric.active");
    await expect(activeMetric).toContainText("Best-Quote");
  });

  test("sollte Serien ein-/ausblenden können", async ({ page }) => {
    const seriesToolbar = page.locator(".series-toolbar");
    const seriesButtons = seriesToolbar.locator("button.pill.series");
    const count = await seriesButtons.count();

    if (count > 0) {
      const firstSeries = seriesButtons.first();

      // Prüfe initialen Zustand
      let classes = await firstSeries.getAttribute("class");
      const initiallyVisible = !classes?.includes("off");

      // Toggle
      await firstSeries.click();
      await page.waitForTimeout(300);

      // Prüfe neuen Zustand
      classes = await firstSeries.getAttribute("class");
      const nowVisible = !classes?.includes("off");

      // Sollte umgedreht sein
      expect(nowVisible).toBe(!initiallyVisible);
    }
  });

  test("sollte Chart bei Daten-Updates aktualisieren", async ({ page }) => {
    // Klicke ein paar Thumbnails im manuellen Modus
    const thumbnails = page.locator(".thumb-grid > *");
    const count = await thumbnails.count();

    if (count > 0) {
      await thumbnails.first().click();
      await page.waitForTimeout(300);

      await thumbnails.nth(1 % count).click();
      await page.waitForTimeout(300);

      // Chart sollte noch sichtbar sein
      const canvas = page.locator("canvas");
      await expect(canvas).toBeVisible();
    }
  });
});
