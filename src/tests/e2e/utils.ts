import { Page, expect } from "@playwright/test";

/** Navigiert zur Startseite und wartet auf stabile Grundzustände. */
export async function gotoHome(page: Page) {
  await page.goto("/");
  await expect(page).toHaveTitle(/Bandit-Studio/i);
  await expect(page.locator("header.bar")).toBeVisible();
  const manual = page.locator("#manual-section");
  const runner = page.locator("#runner-controls");
  await Promise.race([
    manual.waitFor({ state: "visible" }).catch(() => {}),
    runner.waitFor({ state: "visible" }).catch(() => {}),
  ]);
}

/** Stellt den Debug-State her, verifiziert per localStorage + aria-pressed. */
export async function ensureDebugState(page: Page, on: boolean) {
  const btn = page.getByRole("button", { name: /Debug:/i });
  await expect(btn).toBeVisible();

  // Aktuellen Persistenzzustand lesen
  const persisted = await page.evaluate(
    () => localStorage.getItem("banditstudio.debug") === "true",
  );

  // Nur klicken, wenn tatsächlich geändert werden muss
  if (persisted !== on) {
    await btn.click();
    // Persistenz bestätigen
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem("banditstudio.debug")),
      )
      .toBe(on ? "true" : "false");
  }

  // UI-Zustand robust prüfen (Firefox-Hydration: Text kommt evtl. später)
  await expect
    .poll(async () => (await btn.getAttribute("aria-pressed")) || "")
    .toBe(on ? "true" : "false");
}

/** Optional: UI-Check ohne Persistenzänderung – robust gegen leeren Text. */
export async function expectDebugUI(page: Page, on: boolean) {
  const btn = page.getByRole("button", { name: /Debug:/i });
  await expect(btn).toBeVisible();
  await expect
    .poll(async () => (await btn.getAttribute("aria-pressed")) || "")
    .toBe(on ? "true" : "false");

  // Falls Text bereits gerendert, zusätzlich soft validieren (kein Muss)
  const txt = ((await btn.textContent()) || "").trim();
  if (txt) {
    await expect(btn).toHaveText(on ? /Debug:\s*an/i : /Debug:\s*aus/i);
  }
}

/** Akzeptiert den nächsten Confirm-Dialog (z. B. Reset). */
export async function acceptNextDialog(page: Page) {
  page.once("dialog", async (d) => {
    try {
      await d.accept();
    } catch {}
  });
}

/** Verwirft den nächsten Confirm-Dialog. */
export async function dismissNextDialog(page: Page) {
  page.once("dialog", async (d) => {
    try {
      await d.dismiss();
    } catch {}
  });
}

/** Klickt robust auf die erste manuelle Thumbnail-Karte. */
export async function clickFirstManualCard(page: Page) {
  const byLabel = page.getByText(/Thumbnail\s*A\b/i).first();
  if (await byLabel.count()) {
    await byLabel.click();
    return;
  }
  const manual = page.locator("#manual-section");
  const anyButton = manual.getByRole("button").first();
  if (await anyButton.count()) {
    await anyButton.click();
    return;
  }
  const firstCell = manual.locator(".thumb-grid :scope > *").first();
  await firstCell.click();
}

/** Moduswechsel: Algo. */
export async function switchToAlgoMode(page: Page) {
  const container = page.locator("#mode-switch");
  const candidates = [
    container.getByRole("button", { name: /algo|algorithm/i }),
    page.getByRole("tab", { name: /algo|algorithm/i }),
    container,
  ];
  for (const c of candidates) {
    if ((await c.count()) > 0) {
      await c
        .first()
        .click()
        .catch(() => {});
      break;
    }
  }
  await expect(page.locator("#runner-controls")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#manual-section")).toHaveCount(0);
}

/** Moduswechsel: Manual. */
export async function switchToManualMode(page: Page) {
  const container = page.locator("#mode-switch");
  const candidates = [
    container.getByRole("button", { name: /manuell|manual/i }),
    page.getByRole("tab", { name: /manuell|manual/i }),
    container,
  ];
  for (const c of candidates) {
    if ((await c.count()) > 0) {
      await c
        .first()
        .click()
        .catch(() => {});
      break;
    }
  }
  await expect(page.locator("#manual-section")).toBeVisible({ timeout: 5000 });
}
