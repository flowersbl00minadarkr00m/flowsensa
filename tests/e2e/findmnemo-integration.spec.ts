import { expect, test } from "@playwright/test";

const TELEMETRY_ROWS = [
  {
    event_id: "mn-e1",
    case_id: "mn-case-1",
    sequence: 0,
    timestamp: "2026-07-05T10:00:00.000Z",
    duration_ms: 120000,
    intent: "Ship a feature",
    activity: { id: "ticket-created", type: "intake", label: "Create ticket", primitiveVersion: "1.0.0" },
    actor: { id: "agent-pi", type: "agent", label: "Pi", role: "AI work agent", authorityLevel: 3 },
    system: { id: "openai-api", label: "OpenAI API", tool: "codex", model: "gpt-4.1" },
    transition: null,
    result: { status: "success" },
    decision: null,
    objects: null,
    evidence: null,
    accepted_outcome: true,
    truth_state: "observed",
    provenance: { sourceType: "mnemosync", sourceRef: "mnemosync://telemetry/mn-e1", ingestedAt: "2026-07-05T10:00:01.000Z" },
    resources: [
      { kind: "input-tokens", value: 1500, unit: "tokens", measurementClass: "provider-reported", sourceRef: "usage://mn-e1" },
      { kind: "human-time", value: 2, unit: "minutes", measurementClass: "estimated", allocationMethod: "manual estimate", sourceRef: "timer://mn-e1" },
      { kind: "water", value: 1, unit: "liter", measurementClass: "estimated", allocationMethod: "excluded", sourceRef: "excluded://mn-e1" },
    ],
    tags: ["pi", "mnemosync"],
    agent_source: "pi",
  },
  {
    event_id: "mn-e2",
    case_id: "mn-case-1",
    sequence: 1,
    timestamp: "2026-07-05T10:05:00.000Z",
    duration_ms: 90000,
    intent: "Ship a feature",
    activity: { id: "work-executed", type: "execute", label: "Do the work", primitiveVersion: "1.0.0" },
    actor: { id: "agent-pi", type: "agent", label: "Pi", role: "AI work agent", authorityLevel: 3 },
    system: { id: "anthropic-api", label: "Anthropic API", tool: "claude-code", model: "claude-sonnet" },
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

test("Sync with FindMnemo imports telemetry from the shared Supabase table", async ({ page }) => {
  await page.route("**/rest/v1/telemetry_events*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-1/2" },
      body: JSON.stringify(TELEMETRY_ROWS),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: /Sync with FindMnemo/ }).first().click();

  await expect(page.locator(".workspace-import-status")).toContainText("accepted, 0 rejected");
  await expect(page.getByText("Process Workspace")).toBeVisible();
  await expect(page.getByText("Synthetic sample data loaded locally")).toHaveCount(0);

  await page.getByRole("button", { name: /Evidence Log/ }).click();
  await expect(page.getByText("gpt-4.1")).toBeVisible();
  await expect(page.getByText("claude-sonnet")).toBeVisible();
  await expect(page.getByText("input-tokens: 1500 tokens")).toBeVisible();
  await expect(page.getByText("water")).toHaveCount(0);
});
