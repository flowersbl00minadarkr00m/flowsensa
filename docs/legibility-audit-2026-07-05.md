# Flowsensa Legibility Audit — 2026-07-05

Status: Blocking findings against the current runtime  
Scope: User-provided Alerts and Process Explorer screenshots, current CSS
tokens/cascade, desktop runtime structure, and responsive acceptance criteria.

## Verdict

The current build is not ready for a recorded demo. The imported dark
ocean-blue/yellow token system is overwritten by a later legacy light/purple
`:root` declaration. Components written for dark surfaces consequently render
light text on a near-white workspace.

## Blocking findings

| Finding | Evidence | Impact | Required correction |
|---|---|---|---|
| Main headings are nearly invisible | `#e8f0fc` on `#ececf2` is approximately `1.03:1` | Alerts and Process Graph headings cannot be read reliably | Remove legacy token override and verify computed colour on every surface |
| Muted workspace copy fails contrast | `#7a9cc0` on `#ececf2` is approximately `2.43:1` | Counts, instructions, and metadata disappear | Use dark ink on light surfaces or keep the workspace consistently dark |
| Small dim labels fail on dark panels | `#4a6a8a` on `#0d1e35` is approximately `2.97:1` | Rule metadata and secondary labels are hard to read | Raise token contrast to at least `4.5:1` for small text |
| Header metadata collides | “Imported process workspacePrivate local data” in the screenshot | Product state and privacy state become ambiguous | Use separate flex/grid regions with wrapping and minimum gaps |
| Process node truncates its only label | “Handoff work bet…” | User cannot identify the activity without opening it | Wrap the label or provide full accessible text and visible detail on focus/tap |
| Success banner uses low-contrast teal on pale cyan | Screenshot evidence | Import result is visually weak despite being important | Use dark semantic text with a visible success icon/border |
| Numbered navigation remains | `01`–`10` visible in Process Explorer screenshot | Reintroduces the rejected staged/AI-generated feel | Remove numeric prefixes; retain enterprise module names |
| Default AP narrative remains | Northstar banner and AP fixture | Demo contradicts intended creator/project use | Replace the default fixture and all related copy |
| Mobile proof is absent | No `docs/screenshots/` output from responsive task | Responsive support is unverified | Capture and inspect all core screens at 375px and 768px |

## Contrast checks that currently pass

| Pair | Ratio |
|---|---:|
| `#e8f0fc` on `#112240` | `13.79:1` |
| `#f5c842` on `#112240` | `9.97:1` |
| `#7a9cc0` on `#0d1e35` | `5.86:1` |

These passing pairs support using one consistent dark workspace rather than
mixing dark-module tokens with the legacy light page.

## Required verification matrix

Inspect every primary module at `375`, `768`, `1024`, `1280`, and `1440` pixels:

- default populated state;
- empty and first-use state;
- loading and synchronization state;
- validation and network error state;
- selected process node and evidence drawer;
- hover, keyboard focus, touch/tap, and disabled controls;
- long labels, long event IDs, long project names, and translated-width stress;
- 200% browser zoom and reduced-motion mode.

Automated contrast checks should supplement, not replace, screenshot review.
