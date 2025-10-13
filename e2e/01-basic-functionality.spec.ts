import { test, expect } from "@playwright/test";
import { BanditStudioPage, clearBrowserData, waitForChart } from "./helpers";

test.describe("Grundlegende Funktionen", () => {
  let banditPage: BanditStudioPage;

  test.beforeEach(async ({ page }) => {
    banditPage = new BanditStudioPage(page);
    await clearBrowserData(page);
    await page.waitForLoadState("networkidle");
  });

  test("sollte die Anwendung erfolgreich laden", async ({ page }) => {
    // Prüfe ob Hauptelemente sichtbar sind
    await expect(page.locator(".brand")).toContainText("Bandit-Studio");
    await expect(page.locator("#env-setup")).toBeVisible();
    await expect(page.locator("#chart-area")).toBeVisible();
  });

  test("sollte Standard-Einstellungen haben", async ({ page }) => {
    // Prüfe Standardwerte
    const select = page.locator("select").first();
    const envType = await select.inputValue();
    expect(envType).toBe("gaussian");

    // Prüfe ob Manueller Modus aktiv ist
    const manualSection = page.locator("#manual-section");
    await expect(manualSection).toBeVisible();
  });

  test("sollte zwischen Environment-Typen wechseln können", async ({
    page,
  }) => {
    const select = page.locator("select").first();

    // Wechsel zu Bernoulli
    await select.selectOption("bernoulli");
    await page.waitForTimeout(500);

    let value = await select.inputValue();
    expect(value).toBe("bernoulli");

    // Zurück zu Gaussian
    await select.selectOption("gaussian");
    await page.waitForTimeout(500);

    value = await select.inputValue();
    expect(value).toBe("gaussian");
  });

  test("sollte Chart mit Metriken anzeigen", async ({ page }) => {
    await waitForChart(page);

    // Prüfe ob Chart-Elemente vorhanden sind
    const chartArea = page.locator("#chart-area");
    await expect(chartArea).toBeVisible();

    // Prüfe Metrik-Pills
    const metricPills = page.locator(".metric-pills");
    await expect(metricPills).toContainText("Σ Reward");
    await expect(metricPills).toContainText("Ø Reward");
    await expect(metricPills).toContainText("Regret");
    await expect(metricPills).toContainText("Best-Quote");

    // Prüfe Canvas
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });
});
