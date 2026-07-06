import { expect, test } from "@playwright/test";

/**
 * Verifies the "Sync with Mnemosync" flow: the app reads process telemetry
 * from the shared Supabase `telemetry_events` table and imports it as a
 * canonical WorkEvent collection. The Supabase REST response is mocked so the
 * test is deterministic and offline.
 */
const TELEMETRY_ROWS = [
  {
    event_id: "mn-e1",
    case_id: "mn-case-1",
    sequence: 0,
    timestamp: "2026-07-05T10:00:00.000Z",
    intent: "Ship a feature",
    activity: { id: "ticket-created", type: "intake", label: "Create ticket", primitiveVersion: "1.0.0" },
    actor: { id: "agent-pi", type: "agent", label: "Pi", role: "AI work agent", authorityLevel: 3 },
    transition: null,
    result: { status: "success" },
    decision: null,
    objects: null,
    evidence: null,
    accepted_outcome: true,
    truth_state: "observed",
    provenance: { sourceType: "mnemosync", sourceRef: "mnemosync://telemetry/mn-e1", ingestedAt: "2026-07-05T10:00:01.000Z" },
    tags: ["pi", "mnemosync"],
    agent_source: "pi",
  },
  {
    event_id: "mn-e2",
    case_id: "mn-case-1",
    sequence: 1,
    timestamp: "2026-07-05T10:05:00.000Z",
    intent: "Ship a feature",
    activity: { id: "work-executed", type: "execute", label: "Do the work", primitiveVersion: "1.0.0" },
    actor: { id: "agent-pi", type: "agent", label: "Pi", role: "AI work agent", authorityLevel: 3 },
    transition: null,
    result: { status: "success" },
    decision: null,
    objects: null,
    evidence: null,
    accepted_outcome: true,
    truth_state: "observed",
    provenance: { sourceType: "mnemosync", sourceRef: "mnemosync://telemetry/mn-e2", ingestedAt: "2026-07-05T10:05:01.000Z" },
    tags: ["pi", "mnemosync"],
    agent_source: "pi",
  },
];

test("Sync with Mnemosync imports telemetry from the shared Supabase table", async ({ page }) => {
  await page.route("**/rest/v1/telemetry_events*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-1/2" },
      body: JSON.stringify(TELEMETRY_ROWS),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: /Sync with Mnemosync/ }).first().click();

  await expect(page.getByRole("status")).toContainText("accepted, 0 rejected");
  await expect(page.getByText("Process workspace")).toBeVisible();
  // Synced (non-sample) data drops the "sample data" marker from the header.
  await expect(page.getByText("· sample data")).toHaveCount(0);
});
