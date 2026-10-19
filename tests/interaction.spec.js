const { test, expect } = require("playwright/test");
const path = require("path");
const { pathToFileURL } = require("url");

const pageUrl = pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;

for (const viewport of [
  { name: "desktop-1640", width: 1640, height: 900 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "mobile-390", width: 390, height: 844 }
]) {
  test(`${viewport.name}: mở, đọc lại, đóng và chuyển thiệp`, async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.setViewportSize(viewport);
    await page.goto(pageUrl, { waitUntil: "domcontentloaded" });

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    await expect(page.locator("[data-card]")).toHaveCount(3);

    const envelopeMetrics = await page.locator(".envelope-card").evaluateAll((cards) => cards.map((card) => {
      const style = getComputedStyle(card);
      return { width: parseFloat(style.width), height: parseFloat(style.height) };
    }));

    if (viewport.width >= 1200) {
      envelopeMetrics.forEach(({ width, height }) => {
        expect(width).toBeGreaterThanOrEqual(339);
        expect(width).toBeLessThanOrEqual(341);
        expect(height).toBeGreaterThanOrEqual(219);
        expect(height).toBeLessThanOrEqual(221);
      });
      const verticalGap = await page.evaluate(() => {
        const copy = document.querySelector(".welcome__copy").getBoundingClientRect();
        const choices = document.querySelector(".envelope-choices").getBoundingClientRect();
        return choices.top - copy.bottom;
      });
      expect(verticalGap).toBeGreaterThanOrEqual(30);
      expect(verticalGap).toBeLessThanOrEqual(60);
    } else if (viewport.width >= 992) {
      envelopeMetrics.forEach(({ width }) => {
        expect(width).toBeGreaterThanOrEqual(280);
        expect(width).toBeLessThanOrEqual(310);
      });
    } else {
      envelopeMetrics.forEach(({ width }) => expect(width).toBeLessThanOrEqual(viewport.width - 24));
    }

    if (viewport.name === "desktop-1640") {
      await page.evaluate(() => {
        document.querySelector('[data-card="mom"]').click();
        document.querySelector('[data-card="paternalGrandma"]').click();
        document.querySelector('[data-card="maternalGrandma"]').click();
      });
      await expect(page.locator("#momCard")).toHaveAttribute("aria-hidden", "false", { timeout: 3000 });
      await expect(page.locator("#paternalGrandmaCard")).toHaveAttribute("aria-hidden", "true");
      await expect(page.locator("#maternalGrandmaCard")).toHaveAttribute("aria-hidden", "true");
      await page.locator("#momCard [data-action='close']").click();
      await expect(page.locator("#welcome")).toBeVisible();
    }

    const cardCases = [
      { id: "mom", view: "#momCard", title: "Gửi mẹ yêu của con" },
      { id: "paternalGrandma", view: "#paternalGrandmaCard", title: "Gửi bà nội kính yêu" },
      { id: "maternalGrandma", view: "#maternalGrandmaCard", title: "Gửi bà ngoại kính yêu" }
    ];

    for (const cardCase of cardCases) {
      await page.locator(`[data-card="${cardCase.id}"]`).click();
      await expect(page.locator(cardCase.view)).toHaveAttribute("aria-hidden", "false", { timeout: 3000 });
      await expect(page.locator(`${cardCase.view} h2`)).toHaveText(cardCase.title);
      await page.waitForTimeout(500);

      for (const otherCard of cardCases.filter((item) => item.id !== cardCase.id)) {
        await expect(page.locator(otherCard.view)).toHaveAttribute("aria-hidden", "true");
      }

      await page.locator(`${cardCase.view} [data-action='replay']`).click();
      await expect(page.locator(cardCase.view)).toHaveClass(/is-reading/);
      await page.locator(`${cardCase.view} [data-action='close']`).click();
      await expect(page.locator("#welcome")).toBeVisible();
    }

    await page.locator("#soundToggle").click();
    await expect(page.locator("#soundToggle")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#soundToggle").click();
    await expect(page.locator("#soundToggle")).toHaveAttribute("aria-pressed", "false");

    expect(consoleErrors).toEqual([]);
  });
}
