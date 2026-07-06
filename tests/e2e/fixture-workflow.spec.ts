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
  await expect(page.getByText("Good morning, process engineer.")).toBeVisible();
  await expect(page.getByText("Fictional demo", { exact: true })).toBeVisible();
  await expect(page.getByText("northstar-invoice-2402", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "Confirm" }).click();
  const rationale = page.getByLabel("Override rationale").first();
  await rationale.focus();
  await rationale.fill("Confirmed against AP policy; owner reviewed.");
  await expect(rationale).toBeFocused();
  await page.getByLabel("Accountable owner").first().fill("AP process owner");
  await page.getByRole("button", { name: "Confirm step" }).first().click();
  await expect(page.getByText("user-confirmed").first()).toBeVisible();

  await page.getByRole("button", { name: "Engineer" }).click();
  await expect(page.getByText("Sixteen rubric factors").first()).toBeVisible();
  await expect(page.getByText("Responsibility & control gaps")).toBeVisible();
  await expect(page.getByText("Deterministic / vibe-code").first()).toBeVisible();
  await expect(page.getByText("Hybrid / agent with harness").first()).toBeVisible();

  await page.getByRole("button", { name: "Ask" }).click();
  await page
    .getByRole("button", { name: "Which activities repeat most often?" })
    .click();
  await expect(page.locator(".answer-summary")).toContainText("repeat(s)");

  await page.getByRole("button", { name: "Export" }).click();
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
