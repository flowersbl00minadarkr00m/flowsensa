import { expect, test } from "@playwright/test";

// Spec 006 R1 (T1): the workspace chrome must render clean UTF-8 and a
// non-overlapping header at desktop width.
test("workspace chrome has clean glyphs and a stacked header", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 850 });
  await page.goto("/");
  await expect(page.getByText("Process Workspace")).toBeVisible();

  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText).not.toMatch(/Â|â€|âœ|â—|â˜/);
  expect(bodyText).toContain("·");

  const layout = await page.evaluate(() => {
    const strong = document.querySelector(".ws-context strong");
    const span = document.querySelector(".ws-context span");
    if (!strong || !span) return null;
    const a = strong.getBoundingClientRect();
    const b = span.getBoundingClientRect();
    return { stacked: b.top >= a.bottom - 2 };
  });
  expect(layout).not.toBeNull();
  expect(layout?.stacked).toBe(true);
});

// Spec 006 R5 (T7): every evidence link routes to the Evidence Log filtered
// to its supporting records, with a visible, clearable filter banner.
test("risk evidence drills through to a filtered Evidence Log", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /02\s*Process Risks/ }).last().click();
  await expect(page.getByRole("heading", { name: "Process Risks" })).toBeVisible();

  const evidenceButton = page.getByRole("button", { name: /^Evidence \(\d+\)/ }).first();
  const count = Number((await evidenceButton.innerText()).match(/\((\d+)\)/)?.[1]);
  await evidenceButton.click();

  // Landed on Activity Log, filtered to exactly the linked records.
  await expect(page.getByRole("heading", { name: "Activity Log" })).toBeVisible();
  const banner = page.locator(".evidence-filter-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("risk");
  await expect(page.locator(".activity-log-row")).toHaveCount(count);

  // Clearing restores the full log.
  await page.getByRole("button", { name: "Clear filter", exact: true }).click();
  await expect(page.locator(".evidence-filter-banner")).toHaveCount(0);
  const total = await page.locator(".activity-log-row").count();
  expect(total).toBeGreaterThan(count);
});

// Spec 006 R1 (T3): one dismissible notice strip; dismissal survives reload
// and degrades to a compact sample-data badge.
test("notice strip dismisses, persists, and leaves a sample badge", async ({ page }) => {
  await page.goto("/");
  const strip = page.locator(".workspace-import-status");
  await expect(strip).toBeVisible();
  await expect(strip).toContainText("Synthetic sample data loaded locally");

  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(strip).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sample data", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Process Workspace")).toBeVisible();
  await expect(page.locator(".workspace-import-status")).toHaveCount(0);

  // Badge click restores the strip.
  await page.getByRole("button", { name: "Sample data", exact: true }).click();
  await expect(page.locator(".workspace-import-status")).toBeVisible();
});
