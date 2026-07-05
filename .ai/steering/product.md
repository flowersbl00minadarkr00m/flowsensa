# Product Steering — Flowsensa

## Product Vision

A deployable, local-first process-intelligence product that turns normalized
human, agent, and system work events into a confirmable process graph. Its
primary showcase follows creator and builder work: developing posts, researching
claims, planning projects, coding, reviewing, testing, publishing, and learning
from outcomes.

## Target Users / Personas

- **Process analyst / operations professional:** Has work events (human, agent, system logs) and needs to see the actual process — not the documented one
- **Automation evaluator:** Needs a transparent rubric to decide which steps can and should be automated
- **Creator / builder:** Wants to understand and improve work performed across
  personal activity, coding agents, research tools, and publishing workflows

## Value Proposition

No server, model key, paid service, or external font is required for the
deterministic core. Flowsensa takes work events → reconstructs the process →
links every step to telemetry → identifies friction → proposes improvements →
exports decisions. Synthetic showcase data must resemble Henry's post and
software-project workflows; accounts payable is not a default product story.

## Product Boundaries

### In Scope

- Event ingestion (human, agent, system work events in normalized format)
- Process graph reconstruction and confirmation
- Automation rubric: transparent classification per step
- Creator and software-project showcase with live demo activity
- Evidence drill-down from process nodes and transitions to source events
- Deterministic Q&A
- Exports: JSON, Markdown, Mermaid
- Local persistence

### Out of Scope

- Real-time event streaming
- Integration with live systems (import only)
- Multi-user collaboration
- AI-based process mining (deterministic only)

## Success Metrics

- Process confirmation rate (user confirms reconstructed graph matches reality)
- Friction points identified per process
- Export usage (which formats are used)

## Domain Glossary

- **Work event:** A normalized record of human, agent, or system activity
- **Process graph:** The reconstructed sequence of steps with branches and dependencies
- **Automation rubric:** Classification of each step by automation suitability
- **Creator workflow:** A case representing post research, drafting, review,
  publication, project planning, coding, verification, or deployment
