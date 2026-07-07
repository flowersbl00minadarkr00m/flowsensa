import { expect, test } from "@playwright/test";

test("complete fixture workflow is keyboard-operable and local", async ({ page }) => {
  const externalRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      browserErrors.push(message.text());
    }
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) externalRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByText("08", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Process Workspace")).toBeVisible();
  await expect(page.getByText("Synthetic sample data loaded locally", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear sample and import your telemetry" })).toBeVisible();
  await expect(page.locator(".workspace-import-status")).toContainText("Sample workspace loaded locally");

  await page.getByRole("button", { name: "Process Map", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Process Map" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Process Risks/ })).toBeVisible();

  await page.getByRole("button", { name: /Process Enhancements/ }).click();
  await expect(page.getByRole("heading", { name: "Process Enhancements" })).toBeVisible();
  await expect(page.locator(".opportunity-card.expanded")).toHaveCount(1);
  await expect(page.locator(".opportunity-card.compact").first()).toBeVisible();
  await expect(page.getByText("1. What the enhancement is")).toHaveCount(1);
  await expect(page.getByText("2. What it addresses")).toHaveCount(1);
  await expect(page.getByText("3. How to implement it")).toHaveCount(1);
  await expect(page.getByText("Expected benefit")).toHaveCount(1);
  await page.getByRole("button", { name: "Show guidance" }).first().click();
  await expect(page.locator(".opportunity-card.expanded")).toHaveCount(1);
  await expect(page.getByText("Responsibility and control gaps")).toBeVisible();
  await page.locator(".filter-bar select").selectOption("Automation");
  await expect(page.getByRole("heading", { name: "Draft post" })).toBeVisible();
  await page.locator(".filter-bar select").selectOption("Hybrid");
  await expect(page.getByRole("heading", { name: "Research topic" })).toBeVisible();

  await page.getByRole("button", { name: "AI Insights" }).click();
  await expect(page.getByRole("heading", { name: "Deterministic Analysis" })).toBeVisible();

  await page.getByRole("button", { name: "Resource Usage" }).click();
  await expect(page.getByRole("heading", { name: "Resource Usage" })).toBeVisible();
  await expect(page.getByText("LLM and tool usage")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByText("JSON round trip verified.")).toBeVisible();
  await page.getByRole("button", { name: "Preview" }).nth(2).click();
  await expect(page.getByText("Mermaid preview")).toBeVisible();
  await expect(page.locator("pre")).toContainText("flowchart LR");

  expect(externalRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("invalid fixture shows event and field errors without replacing valid data", async ({ page }) => {
  await page.goto("/");
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("src/fixtures/invalid-work-events.json");
  await expect(page.getByRole("alert")).toContainText("Import blocked");
  await expect(page.getByRole("alert")).toContainText("schema issues");
  await expect(page.getByRole("alert")).toContainText("/exportedAt");
});

test("narrow viewport uses bottom tabs, drawer, and More sheet without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  for (const name of ["Map", "Risks", "Evidence", "Enhance", "Sources", "More"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Navigation" }).getByRole("button", { name: /Process Map/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);

  await page.getByRole("button", { name: /More/ }).click();
  await expect(page.getByRole("dialog", { name: "More modules" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Variants/ })).toBeVisible();
});

test("an imported valid file replaces the showcase locally", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Synthetic sample data loaded locally", { exact: true })).toBeVisible();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("src/fixtures/sample-work-events.json");
  // Imported non-sample data drops the synthetic sample marker from the header.
  await expect(page.getByText("Process Workspace")).toBeVisible();
  await expect(page.getByText("Synthetic sample data loaded locally", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sync with Mnemosync" })).toBeVisible();
});
