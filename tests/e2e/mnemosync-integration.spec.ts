import { expect, test } from "@playwright/test";

test("a real Mnemosync activity export imports directly into Flowsensa", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.evaluate(() => {
    localStorage.removeItem("mnemosync_work_events_v1");
  });
  await page.reload();

  const exportButton = page.getByTitle(
    "Export the local activity ledger for Flowsensa or another schema-compatible consumer.",
  );
  const countBefore = Number((await exportButton.textContent())?.match(/\d+/)?.[0] ?? "0");

  await page.getByRole("button", { name: "⇄ Sync", exact: true }).click();
  await expect
    .poll(async () => Number((await exportButton.textContent())?.match(/\d+/)?.[0] ?? "0"))
    .toBeGreaterThan(countBefore);

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByTitle(
      "Export the local activity ledger for Flowsensa or another schema-compatible consumer.",
    )
    .click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  await page.goto("http://127.0.0.1:4174/");
  await page.locator('input[type="file"]').setInputFiles(downloadPath!);
  await expect(page.getByText("Imported process workspace")).toBeVisible();
  await expect(page.getByText("Private local data")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("accepted, 0 rejected");
  await expect(page.getByRole("heading", { name: "Top Opportunities" })).toBeVisible();
});
