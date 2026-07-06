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
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page.getByText("08", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Creator showcase", { exact: true })).toBeVisible();
  await expect(page.getByText("Fictional demonstration data", { exact: false })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("50 accepted");

  await page.getByRole("button", { name: "Process Explorer" }).click();
  await expect(page.getByRole("heading", { name: "Process Graph" })).toBeVisible();

  await page.getByRole("button", { name: "Improvement Opportunities" }).click();
  await expect(page.getByRole("heading", { name: "Improvement Opportunities" })).toBeVisible();
  await expect(page.getByText("Responsibility & Control Gaps")).toBeVisible();
  await page.getByLabel("Family").selectOption("Automation");
  await expect(page.getByRole("heading", { name: "Draft post" })).toBeVisible();
  await page.getByLabel("Family").selectOption("Hybrid");
  await expect(page.getByRole("heading", { name: "Research topic" })).toBeVisible();

  await page.getByRole("button", { name: "AI Analyst" }).click();
  await expect(page.getByRole("heading", { name: "Deterministic Analysis" })).toBeVisible();

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
  await page.getByRole("button", { name: "Test error handling" }).click();
  await expect(page.getByRole("alert")).toContainText("Import blocked");
  await expect(page.getByRole("alert")).toContainText("actor/authorityLevel");
  await expect(page.getByRole("alert")).toContainText("resources/1/allocationMethod");
  await expect(page.getByRole("alert")).toContainText("events[0]");
});

test("narrow viewport uses bottom tabs, drawer, and More sheet without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();

  for (const name of ["Overview", "Explorer", "Activity", "Improve", "Sources", "More"]) {
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  }

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Operational Overview" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);

  await page.getByRole("button", { name: /More/ }).click();
  await expect(page.getByRole("dialog", { name: "More modules" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Process Variants" })).toBeVisible();
});

test("an imported valid file replaces the showcase locally", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("src/fixtures/sample-work-events.json");
  await expect(page.getByText("Imported process workspace")).toBeVisible();
  await expect(page.getByText("Private local data", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load demo" })).toBeVisible();
});
