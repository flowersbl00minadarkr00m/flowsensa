import type {
  Activity,
  Actor,
  ResourceMeasurement,
  WorkEvent,
  WorkEventCollection,
} from "../domain/types";

// ── Creator + project activity catalog ──────────────────────────────────────

const ACTIVITIES = {
  research:     { id: "research-topic",     label: "Research topic",          type: "extract" as const },
  draft:        { id: "draft-post",         label: "Draft post",              type: "execute" as const },
  review:       { id: "review-draft",       label: "Review draft",            type: "review" as const },
  revise:       { id: "revise-draft",       label: "Revise draft",            type: "execute" as const },
  qa:           { id: "qa-post",            label: "QA post",                 type: "validate" as const },
  publish:      { id: "publish-post",       label: "Publish post",            type: "close" as const },
  plan:         { id: "plan-feature",       label: "Plan feature",            type: "decide" as const },
  spec:         { id: "write-spec",         label: "Write specification",     type: "execute" as const },
  code:         { id: "implement-code",     label: "Implement code",          type: "execute" as const },
  test:         { id: "run-tests",          label: "Run tests",               type: "validate" as const },
  fix:          { id: "fix-issues",         label: "Fix issues",              type: "execute" as const },
  codeReview:   { id: "code-review",        label: "Code review",             type: "review" as const },
  deploy:       { id: "deploy-release",     label: "Deploy release",          type: "execute" as const },
  verify:       { id: "verify-deploy",      label: "Verify deployment",       type: "validate" as const },
} as const satisfies Record<string, Activity>;

const ACTORS = {
  henry:        { id: "henry",              label: "Henry",                  type: "human" as const,  role: "Creator",       authorityLevel: 7 },
  pi:           { id: "agent-pi",           label: "Pi",                     type: "agent" as const,  role: "AI work agent", authorityLevel: 3 },
  codex:        { id: "agent-codex",        label: "Codex",                  type: "agent" as const,  role: "AI work agent", authorityLevel: 3 },
  claude:       { id: "agent-claude",       label: "Claude Cowork",          type: "agent" as const,  role: "AI work agent", authorityLevel: 3 },
  vite:         { id: "vite-dev-server",    label: "Vite dev server",        type: "system" as const, role: "Build system",   authorityLevel: 1 },
  git:          { id: "git-vcs",            label: "Git",                    type: "system" as const, role: "Version control", authorityLevel: 2 },
  vercel:       { id: "vercel-platform",    label: "Vercel",                 type: "system" as const, role: "Deploy platform", authorityLevel: 3 },
  tests:        { id: "test-runner",        label: "Test runner",            type: "system" as const, role: "CI verification", authorityLevel: 2 },
  lint:         { id: "linter",             label: "Linter",                 type: "system" as const, role: "Code quality",   authorityLevel: 2 },
  supabase:     { id: "supabase-db",        label: "Supabase",               type: "service-account" as const, role: "Database", authorityLevel: 4 },
  linkedin:     { id: "linkedin-platform",  label: "LinkedIn",               type: "external" as const, role: "Content platform", authorityLevel: 3 },
  substack:     { id: "substack-platform",  label: "Substack",               type: "external" as const, role: "Content platform", authorityLevel: 3 },
} as const satisfies Record<string, Actor>;

const AGENT_SYSTEMS: Partial<Record<keyof typeof ACTORS, NonNullable<WorkEvent["system"]>>> = {
  pi: { id: "openai-api", label: "OpenAI API", tool: "pi", model: "openai/gpt-4.1" },
  codex: { id: "openai-api", label: "OpenAI API", tool: "codex", model: "openai/gpt-5-codex" },
  claude: { id: "anthropic-api", label: "Anthropic API", tool: "claude-code", model: "anthropic/claude-sonnet-4.5" },
};

// ── Post creation lifecycle ─────────────────────────────────────────────────

interface DemoStep {
  activityId: keyof typeof ACTIVITIES;
  actorId: keyof typeof ACTORS;
  fromState: string;
  toState: string;
  durationMs: number;
  waitMinutes: number;
  status?: WorkEvent["result"]["status"];
  reasonCode?: string;
  acceptedOutcome?: boolean;
}

interface DemoCase {
  caseId: string;
  start: string;
  intent: string;
  steps: DemoStep[];
  tags: string[];
}

function systemFor(actorId: keyof typeof ACTORS): WorkEvent["system"] | undefined {
  if (AGENT_SYSTEMS[actorId]) return AGENT_SYSTEMS[actorId];
  if (["vite", "git", "vercel", "tests", "lint", "supabase", "linkedin", "substack"].includes(actorId)) {
    return { id: `${actorId}-system`, label: ACTORS[actorId].label, version: "showcase-v2" };
  }
  return undefined;
}

function resourcesFor(step: DemoStep, eventId: string): ResourceMeasurement[] | undefined {
  const actor = ACTORS[step.actorId];
  if (actor.type === "agent") {
    const inputTokens = Math.max(900, Math.round(step.durationMs / 120));
    const outputTokens = Math.max(240, Math.round(step.durationMs / 420));
    return [
      {
        kind: "input-tokens",
        value: inputTokens,
        unit: "tokens",
        measurementClass: "estimated",
        allocationMethod: "Synthetic demo estimate based on step duration.",
        sourceRef: `demo://resource/${eventId}/input`,
      },
      {
        kind: "output-tokens",
        value: outputTokens,
        unit: "tokens",
        measurementClass: "estimated",
        allocationMethod: "Synthetic demo estimate based on step duration.",
        sourceRef: `demo://resource/${eventId}/output`,
      },
      {
        kind: "financial",
        value: Number(((inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 10).toFixed(4)),
        unit: "USD",
        measurementClass: "estimated",
        allocationMethod: "Synthetic demo token price estimate; not provider billing.",
        sourceRef: `demo://resource/${eventId}/cost`,
      },
    ];
  }
  if (actor.type === "human") {
    return [
      {
        kind: "human-time",
        value: Number((step.durationMs / 60_000).toFixed(1)),
        unit: "minutes",
        measurementClass: "estimated",
        allocationMethod: "Synthetic demo duration estimate.",
        sourceRef: `demo://resource/${eventId}/human-time`,
      },
    ];
  }
  return undefined;
}

const postCreationStandard: DemoStep[] = [
  { activityId: "research", actorId: "pi",       fromState: "idea",          toState: "researched",       durationMs: 120_000, waitMinutes: 0 },
  { activityId: "draft",    actorId: "codex",    fromState: "researched",    toState: "drafted",          durationMs: 300_000, waitMinutes: 5 },
  { activityId: "review",   actorId: "henry",    fromState: "drafted",       toState: "reviewed",         durationMs: 480_000, waitMinutes: 45 },
  { activityId: "revise",   actorId: "codex",    fromState: "reviewed",      toState: "revised",          durationMs: 180_000, waitMinutes: 2 },
  { activityId: "qa",       actorId: "pi",       fromState: "revised",       toState: "qa-passed",        durationMs: 90_000,  waitMinutes: 1 },
  { activityId: "publish",  actorId: "henry",    fromState: "qa-passed",     toState: "published",        durationMs: 60_000,  waitMinutes: 120, acceptedOutcome: true },
];

const projectDeliveryStandard: DemoStep[] = [
  { activityId: "plan",       actorId: "henry",    fromState: "idea",          toState: "planned",          durationMs: 600_000, waitMinutes: 0 },
  { activityId: "spec",       actorId: "pi",       fromState: "planned",       toState: "specified",        durationMs: 240_000, waitMinutes: 10 },
  { activityId: "code",       actorId: "codex",    fromState: "specified",     toState: "implemented",      durationMs: 900_000, waitMinutes: 5 },
  { activityId: "test",       actorId: "tests",    fromState: "implemented",   toState: "tested",           durationMs: 45_000,  waitMinutes: 1 },
  { activityId: "fix",        actorId: "codex",    fromState: "tested",        toState: "fixed",            durationMs: 120_000, waitMinutes: 1 },
  { activityId: "test",       actorId: "tests",    fromState: "fixed",         toState: "re-tested",        durationMs: 45_000,  waitMinutes: 1 },
  { activityId: "codeReview", actorId: "claude",   fromState: "re-tested",     toState: "reviewed",         durationMs: 180_000, waitMinutes: 15 },
  { activityId: "fix",        actorId: "codex",    fromState: "reviewed",      toState: "review-fixes",     durationMs: 60_000,  waitMinutes: 1 },
  { activityId: "deploy",     actorId: "vercel",   fromState: "review-fixes",  toState: "deployed",         durationMs: 90_000,  waitMinutes: 3 },
  { activityId: "verify",     actorId: "pi",       fromState: "deployed",      toState: "verified",         durationMs: 30_000,  waitMinutes: 2, acceptedOutcome: true },
];

// ── Cases: mixed post creation + project delivery ───────────────────────────

const cases: DemoCase[] = [
  // Post 1: clean flow
  {
    caseId: "post-2401",
    start: "2026-06-16T09:00:00Z",
    intent: "Publish LinkedIn post about AI sovereignty and portability",
    steps: postCreationStandard,
    tags: ["post-creation", "linkedin"],
  },
  // Post 2: with revision loop
  {
    caseId: "post-2402",
    start: "2026-06-18T14:00:00Z",
    intent: "Publish Substack deep-dive on agentic AI governance",
    steps: [
      ...postCreationStandard.slice(0, 3),
      { activityId: "revise", actorId: "codex", fromState: "reviewed", toState: "revised", durationMs: 180_000, waitMinutes: 2 },
      { activityId: "review", actorId: "henry", fromState: "revised",  toState: "re-reviewed",       durationMs: 240_000, waitMinutes: 60 },
      { activityId: "revise", actorId: "codex", fromState: "re-reviewed", toState: "final-revised", durationMs: 120_000, waitMinutes: 1 },
      ...postCreationStandard.slice(4),
    ],
    tags: ["post-creation", "substack", "revision-loop"],
  },
  // Post 3: QA caught issues
  {
    caseId: "post-2403",
    start: "2026-06-20T10:30:00Z",
    intent: "Publish LinkedIn post about Codex threading patterns",
    steps: [
      ...postCreationStandard.slice(0, 4),
      { activityId: "qa",     actorId: "pi",    fromState: "revised", toState: "qa-failed", durationMs: 90_000, waitMinutes: 1, status: "failure", reasonCode: "BROKEN_LINK" },
      { activityId: "revise", actorId: "codex", fromState: "qa-failed", toState: "revised", durationMs: 60_000, waitMinutes: 1, status: "retry" },
      { activityId: "qa",     actorId: "pi",    fromState: "revised", toState: "qa-passed", durationMs: 45_000, waitMinutes: 1, status: "retry", reasonCode: "FIX_VERIFIED" },
      ...postCreationStandard.slice(5),
    ],
    tags: ["post-creation", "linkedin", "qa-caught-issue"],
  },
  // Project 1: SDD init for Slate
  {
    caseId: "proj-2401",
    start: "2026-07-01T08:00:00Z",
    intent: "Initialize SDD steering for Slate project",
    steps: projectDeliveryStandard,
    tags: ["project-delivery", "sdd", "slate"],
  },
  // Project 2: Flowsensa closed-loop feature
  {
    caseId: "proj-2402",
    start: "2026-07-04T14:00:00Z",
    intent: "Implement closed-loop recommendations and SDD gate progression for Flowsensa",
    steps: [
      ...projectDeliveryStandard.slice(0, 3),
      { activityId: "test",  actorId: "tests",  fromState: "implemented", toState: "test-failed",     durationMs: 45_000, waitMinutes: 1, status: "failure", reasonCode: "TEST_ASSERTION_FAILED" },
      { activityId: "fix",   actorId: "codex",  fromState: "test-failed", toState: "fixed",           durationMs: 300_000, waitMinutes: 3 },
      { activityId: "test",  actorId: "tests",  fromState: "fixed",      toState: "re-tested",        durationMs: 45_000, waitMinutes: 1, status: "retry", reasonCode: "ALL_TESTS_PASS" },
      ...projectDeliveryStandard.slice(5),
    ],
    tags: ["project-delivery", "flowsensa", "closed-loop"],
  },
  // Project 3: OSSensa GitHub discovery
  {
    caseId: "proj-2403",
    start: "2026-07-05T10:00:00Z",
    intent: "Implement real GitHub discovery and risk disclaimer for OSSensa",
    steps: [
      { activityId: "plan",       actorId: "henry",    fromState: "idea",        toState: "planned",          durationMs: 300_000, waitMinutes: 0 },
      { activityId: "spec",       actorId: "pi",       fromState: "planned",     toState: "specified",        durationMs: 180_000, waitMinutes: 5 },
      { activityId: "code",       actorId: "codex",    fromState: "specified",   toState: "implemented",      durationMs: 600_000, waitMinutes: 2 },
      { activityId: "codeReview", actorId: "claude",   fromState: "implemented", toState: "reviewed",         durationMs: 120_000, waitMinutes: 10 },
      { activityId: "fix",        actorId: "codex",    fromState: "reviewed",    toState: "review-fixes",     durationMs: 60_000,  waitMinutes: 1 },
      { activityId: "deploy",     actorId: "vercel",   fromState: "review-fixes", toState: "deployed",        durationMs: 90_000,  waitMinutes: 2 },
      { activityId: "verify",     actorId: "pi",       fromState: "deployed",    toState: "verified",         durationMs: 30_000,  waitMinutes: 1, acceptedOutcome: true },
    ],
    tags: ["project-delivery", "ossensa", "github-discovery"],
  },
];

// ── Build events ────────────────────────────────────────────────────────────

function buildCase(demoCase: DemoCase): WorkEvent[] {
  let elapsedMinutes = 0;
  return demoCase.steps.map((step, index) => {
    elapsedMinutes += step.waitMinutes;
    const timestamp = new Date(
      Date.parse(demoCase.start) + elapsedMinutes * 60_000,
    ).toISOString();
    const activity = {
      ...ACTIVITIES[step.activityId],
      primitiveVersion: "1.0.0",
    };
    const eventId = `${demoCase.caseId}-step-${String(index + 1).padStart(2, "0")}`;
    const status = step.status ?? "success";
    const hasDecision = ["plan", "spec", "review", "qa", "codeReview", "verify"].includes(step.activityId);

    elapsedMinutes += step.durationMs / 60_000;
    return {
      eventId,
      caseId: demoCase.caseId,
      traceId: `trace-${demoCase.caseId}`,
      parentEventId: index > 0
        ? `${demoCase.caseId}-step-${String(index).padStart(2, "0")}`
        : undefined,
      timestamp,
      sequence: index + 1,
      durationMs: step.durationMs,
      intent: demoCase.intent,
      activity,
      transition: { fromState: step.fromState, toState: step.toState },
      actor: ACTORS[step.actorId],
      system: systemFor(step.actorId),
      decision: hasDecision
        ? {
            id: `${eventId}-decision`,
            selectedPath: status === "exception" || status === "failure" ? "review" : "approved",
            rationale: step.reasonCode
              ? `Review condition: ${step.reasonCode}.`
              : `${activity.label} passed review.`,
            ruleRef: `policy://${step.activityId}-v1`,
            decidingAuthority: ACTORS[step.actorId].id,
          }
        : undefined,
      result: {
        status: step.status ?? "success",
        reasonCode: step.reasonCode,
        retryCount: step.status === "retry" ? 1 : undefined,
      },
      resources: resourcesFor(step, eventId),
      acceptedOutcome: step.acceptedOutcome ?? false,
      truthState: "observed",
      provenance: {
        sourceType: "file-import",
        sourceRef: "demo://creator-showcase/post-project-v2",
        ingestedAt: "2026-07-05T18:00:00Z",
        transformation: "Synthetic creator/project showcase — no real organization data.",
      },
      tags: ["showcase-demo", "synthetic", ...demoCase.tags],
    };
  });
}

export const showcaseWorkEvents: WorkEventCollection = {
  schemaVersion: "1.0.0",
  exportedAt: "2026-07-05T18:00:00Z",
  events: cases.flatMap(buildCase),
};
