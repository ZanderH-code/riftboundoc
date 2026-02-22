import { expect, test } from "@playwright/test";

test("home renders critical shell", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Riftbound FAQ and Rules Portal");
  await expect(page.locator("#home-search-input")).toBeVisible();
});

test("cards filters and modal basic flow", async ({ page }) => {
  await page.goto("cards/");
  await expect(page.locator("#cards-list .card-item").first()).toBeVisible({ timeout: 30_000 });

  const initialCount = await page.locator("#cards-list .card-item").count();
  await page.fill("#cards-search-input", "Ashe");
  await page.waitForTimeout(350);
  const filteredCount = await page.locator("#cards-list .card-item").count();
  expect(filteredCount).toBeLessThanOrEqual(initialCount);

  await page.locator("#cards-list .card-item").first().click();
  await expect(page.locator("#cards-modal")).toBeVisible();
  await expect(page.locator("#cards-modal-title")).not.toHaveText("");
  await page.click("#cards-modal-close");
  await expect(page.locator("#cards-modal")).toBeHidden();
});

test("faq detail renders document", async ({ page }) => {
  await page.goto("faq-detail/");
  await expect(page.locator("#faq-title")).not.toHaveText("Loading...", { timeout: 30_000 });
  await expect(page.locator("#faq-content")).toContainText(/Q:|FAQ/i);
});

test("updates type filter works", async ({ page }) => {
  await page.goto("updates/");
  await expect(page.locator("#updates-list .item").first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "FAQ" }).click();
  const rows = page.locator("#updates-list .item .muted");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(rows.nth(i)).toContainText("Type: FAQ");
  }
});
