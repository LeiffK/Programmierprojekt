import { test, expect } from "@playwright/test";
import { clearBrowserData } from "./helpers";

test.describe("Hilfe und Tutorial", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserData(page);
    await page.waitForLoadState("networkidle");
  });

  test("sollte Tutorial-Button anzeigen", async ({ page }) => {
    const tutorialBtn = page.getByRole("button", {
      name: /anwendung verstehen/i,
    });
    await expect(tutorialBtn).toBeVisible();

    // Sollte Primary-Styling haben
    const classes = await tutorialBtn.getAttribute("class");
    expect(classes).toContain("btn-primary");
  });

  test("sollte Thema-verstehen-Button anzeigen", async ({ page }) => {
    const topicBtn = page.getByRole("button", { name: /thema verstehen/i });
    await expect(topicBtn).toBeVisible();
  });

  test("sollte Thema-Modal öffnen", async ({ page }) => {
    const topicBtn = page.getByRole("button", { name: /thema verstehen/i });
    await topicBtn.click();
    await page.waitForTimeout(500);

    // Prüfe ob Inhalt sichtbar ist
    const content = page.locator("body");
    await expect(content).toContainText(/multi-armed-bandits/i);
    await expect(content).toContainText(/greedy/i);
  });

  test("sollte hilfreiche UI-Elemente haben", async ({ page }) => {
    // Prüfe Labels
    await expect(page.locator("#env-setup")).toContainText("Environment");
    await expect(page.locator("#chart-area")).toContainText("Verläufe");
    await expect(page.locator(".chart-toolbar .label")).toContainText(
      "Kennzahl",
    );

    // Prüfe Toast für Events
    const toast = page.locator(".toast");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Letztes Ereignis");
  });

  test("sollte Branding anzeigen", async ({ page }) => {
    const brand = page.locator(".brand");
    await expect(brand).toBeVisible();
    await expect(brand).toContainText("Bandit-Studio");

    // Logo sollte vorhanden sein
    const logo = page.locator(".yt-logo");
    await expect(logo).toBeVisible();
  });
});
