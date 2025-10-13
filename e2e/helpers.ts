import { Page, expect } from "@playwright/test";

/**
 * Helper functions for E2E tests
 */

export class BanditStudioPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  // Header Actions
  async clickResetButton() {
    await this.page.getByRole("button", { name: /zurücksetzen/i }).click();
  }

  async confirmReset() {
    await this.page
      .getByRole("button", { name: /jetzt zurücksetzen/i })
      .click();
  }

  async cancelReset() {
    await this.page.getByRole("button", { name: /abbrechen/i }).click();
  }

  async toggleDebugMode() {
    await this.page.getByRole("button", { name: /debug/i }).click();
  }

  async isDebugEnabled() {
    const debugBtn = this.page.getByRole("button", { name: /debug/i });
    const text = await debugBtn.textContent();
    return text?.includes("an") ?? false;
  }

  async openTopicUnderstanding() {
    await this.page.getByRole("button", { name: /thema verstehen/i }).click();
  }

  async startTutorial() {
    await this.page
      .getByRole("button", { name: /anwendung verstehen/i })
      .click();
  }

  // Environment Setup
  async selectEnvironmentType(type: "gaussian" | "bernoulli") {
    const select = this.page.locator("select").first();
    await select.selectOption(type);
  }

  async getEnvironmentType() {
    const select = this.page.locator("select").first();
    return await select.inputValue();
  }

  async setNumberOfArms(count: number) {
    // Find the NumericStepper for "Anzahl Thumbnails"
    const field = this.page.locator('.field:has-text("Anzahl Thumbnails")');
    const input = field.locator('input[type="number"]');
    await input.fill(String(count));
  }

  async getNumberOfArms() {
    const field = this.page.locator('.field:has-text("Anzahl Thumbnails")');
    const input = field.locator('input[type="number"]');
    return parseInt(await input.inputValue());
  }

  // Mode Switch
  async switchToManualMode() {
    const modeSwitch = this.page.locator("#mode-switch");
    const manualBtn = modeSwitch.getByRole("button", { name: /manuell/i });
    await manualBtn.click();
  }

  async switchToAlgorithmMode() {
    const modeSwitch = this.page.locator("#mode-switch");
    const algoBtn = modeSwitch.getByRole("button", { name: /algorithmisch/i });
    await algoBtn.click();
  }

  async getCurrentMode() {
    const manualSection = this.page.locator("#manual-section");
    const isManualVisible = await manualSection.isVisible().catch(() => false);
    return isManualVisible ? "manual" : "algo";
  }

  // Manual Mode - Thumbnail Cards
  async clickThumbnail(index: number) {
    const thumbnails = this.page.locator(".thumb-grid > *");
    await thumbnails.nth(index).click();
    // Wait for animation/processing
    await this.page.waitForTimeout(100);
  }

  async getThumbnailCount(index: number) {
    const thumbnails = this.page.locator(".thumb-grid > *");
    const thumbnail = thumbnails.nth(index);
    const countText = await thumbnail
      .locator('.count, [class*="count"]')
      .textContent();
    return parseInt(countText?.match(/\d+/)?.[0] ?? "0");
  }

  async getLastEventText() {
    const toast = this.page.locator(".toast");
    return await toast.textContent();
  }

  // Runner Controls
  async setTotalSteps(steps: number) {
    const field = this.page.locator('.field:has-text("Gesamtsteps")');
    const input = field.locator('input[type="number"]');
    await input.fill(String(steps));
  }

  async setStepsPerSecond(rate: number) {
    const field = this.page.locator('.field:has-text("Schritte/Sekunde")');
    const input = field.locator('input[type="number"]');
    await input.fill(String(rate));
  }

  async clickStartButton() {
    await this.page.getByRole("button", { name: /starten/i }).click();
  }

  async clickPauseButton() {
    await this.page.getByRole("button", { name: /pausieren/i }).click();
  }

  async clickStepButton() {
    await this.page.getByRole("button", { name: /\+1 schritt/i }).click();
  }

  async clickRunnerResetButton() {
    const runnerSection = this.page.locator("#runner-controls");
    await runnerSection.getByRole("button", { name: /zurücksetzen/i }).click();
  }

  async getRunnerStatus() {
    const status = this.page.locator(".status");
    const text = await status.locator(".txt").textContent();
    return text?.trim() ?? "";
  }

  async isRunnerRunning() {
    const status = this.page.locator(".status");
    const classes = await status.getAttribute("class");
    return classes?.includes("running") ?? false;
  }

  // Chart Area
  async selectChartMetric(
    metric: "cumReward" | "avgReward" | "regret" | "bestRate",
  ) {
    const metricLabels: Record<string, string> = {
      cumReward: "Σ Reward",
      avgReward: "Ø Reward",
      regret: "Regret",
      bestRate: "Best-Quote",
    };
    await this.page.getByRole("button", { name: metricLabels[metric] }).click();
  }

  async toggleSeriesVisibility(seriesName: string) {
    const seriesToolbar = this.page.locator(".series-toolbar");
    const seriesBtn = seriesToolbar.getByRole("button", {
      name: new RegExp(seriesName, "i"),
    });
    await seriesBtn.click();
  }

  async isSeriesVisible(seriesName: string) {
    const seriesToolbar = this.page.locator(".series-toolbar");
    const seriesBtn = seriesToolbar.getByRole("button", {
      name: new RegExp(seriesName, "i"),
    });
    const classes = await seriesBtn.getAttribute("class");
    return !classes?.includes("off");
  }

  async getVisibleSeriesCount() {
    const seriesButtons = this.page.locator(
      ".series-toolbar button.pill.series:not(.off)",
    );
    return await seriesButtons.count();
  }

  // Advanced Settings
  async openAdvancedSettings() {
    const advancedSection = this.page.locator("#advanced-settings");
    const toggleBtn = advancedSection.getByRole("button").first();
    await toggleBtn.click();
  }

  async isAdvancedSettingsOpen() {
    // Check if the panel is expanded
    const panel = this.page.locator("#advanced-settings");
    const isVisible = await panel
      .locator('[class*="panel"],[class*="content"]')
      .isVisible()
      .catch(() => false);
    return isVisible;
  }

  // Comparison Table
  async openComparisonTable() {
    const table = this.page.locator("#comparison-table");
    await table.click();
  }

  async getMetricValue(seriesName: string, metric: string) {
    const table = this.page.locator("#comparison-table");
    const row = table.locator("tr").filter({ hasText: seriesName });
    const cell = row.locator(`td:has-text("${metric}")`);
    return await cell.textContent();
  }

  // Assertions
  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }

  async expectVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async expectText(selector: string, text: string | RegExp) {
    await expect(this.page.locator(selector)).toContainText(text);
  }
}

/**
 * Wait for chart to be rendered
 */
export async function waitForChart(page: Page) {
  await page.waitForSelector("canvas", { state: "visible" });
  await page.waitForTimeout(500); // Give ECharts time to render
}

/**
 * Wait for runner to complete
 */
export async function waitForRunnerComplete(page: Page, timeoutMs = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const status = await page.locator(".status .txt").textContent();
    if (status?.includes("Gestoppt") || status?.includes("Pausiert")) {
      break;
    }
    await page.waitForTimeout(500);
  }
}

/**
 * Clear all browser data (localStorage, sessionStorage, etc.)
 */
export async function clearBrowserData(page: Page) {
  // Use context.clearCookies and clearStorageState instead of evaluate
  // This works even before navigating to the page
  await page.context().clearCookies();

  // Navigate to the page first, then clear storage
  await page.goto("/");
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Ignore if localStorage is not available
    }
  });
}
