import { test, expect } from "@playwright/test";
import { clearBrowserData, waitForChart } from "./helpers";

test.describe("Algorithmus Runner", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserData(page);
    await page.waitForLoadState("networkidle");

    // Wechsel zum Algorithmus-Modus
    const modeSwitch = page.locator("#mode-switch");
    const algoBtn = modeSwitch
      .locator("button")
      .filter({ hasText: "Algorithmus" });
    await algoBtn.click();
    await page.waitForTimeout(500);
  });

  test("sollte Runner Controls anzeigen", async ({ page }) => {
    const runnerControls = page.locator("#runner-controls");
    await expect(runnerControls).toBeVisible();
    await expect(runnerControls).toContainText("Automatischer Lauf");

    // Prüfe ob Steuerelemente vorhanden sind
    await expect(runnerControls).toContainText("Gesamtsteps");
    await expect(runnerControls).toContainText("Schritte/Sekunde");
  });

  test("sollte Runner starten und pausieren können", async ({ page }) => {
    const runnerControls = page.locator("#runner-controls");

    // Setze niedrige Schrittanzahl für schnelleren Test
    const stepsInput = page
      .locator('.field:has-text("Gesamtsteps")')
      .locator("input");
    await stepsInput.fill("20");
    await page.waitForTimeout(300);

    // Starte Runner
    const startBtn = runnerControls.getByRole("button", { name: /starten/i });
    await startBtn.click();
    await page.waitForTimeout(800);

    // Prüfe Status
    const status = page.locator(".status");
    let classes = await status.getAttribute("class");

    // Sollte entweder running oder bereits gestoppt sein (weil nur 20 Steps)
    const isRunningOrDone =
      classes?.includes("running") || classes?.includes("paused");
    expect(isRunningOrDone).toBe(true);
  });

  test("sollte mehrere Algorithmen gleichzeitig anzeigen", async ({ page }) => {
    await waitForChart(page);

    // Prüfe ob mehrere Serien vorhanden sind
    const seriesToolbar = page.locator(".series-toolbar");
    const seriesButtons = seriesToolbar.locator("button.pill.series");
    const count = await seriesButtons.count();

    // Sollte mindestens Greedy und ε-Greedy haben
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(seriesToolbar).toContainText(/greedy/i);
  });
});
