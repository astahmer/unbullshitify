# UI/UX review — unbullshitify

Review method: full-page Playwright screenshots of the built app (empty /
filled / settings-modal / configured states, 1440×950) + vision-model
critique, iterated over three rounds. Claims were verified by DOM measurement
where suspicious (e.g. the reported "clipped modal" was actually perfectly
centered at x 528–912 in a 1440 viewport).

Status legend: ✅ fixed · ⏳ deferred (fine to ship, revisit later)

## Layout / visual

| Finding | Status |
|---|---|
| Two-column cards had mismatched heights → visible misalignment | ✅ both cards now `h-full` flex columns, grid stretches |
| No input→output relationship despite the tagline "GPT output → original prompt" | ✅ centered `→` connector between columns on lg+ |
| Massive dead space under content on tall viewports | ✅ mitigated via equal-height cards; ⏳ vertical centering when idle would help more |
| BYOK banner competed with main card for attention | ✅ de-chromed (no ring), tint only |
| Header state was 2–3 cramped pills ("No API key" + provider + key dot) | ✅ single status button with tooltip; warning/success dot |
| Muted text likely failing AA contrast (footer, hints) | ✅ bumped `kumo-inactive` → `kumo-subtle` where it carries content |
| Background grid barely visible / pointless | ⏳ kept — near-invisible texture is intentional |
| Textarea shows native resize handle, clashes with flat look | ⏳ keep: resizing is genuinely useful for long pastes |
| Modal scrim too weak (content behind stays legible) | ⏳ kumo-owned styling; upstream decision |

## Interaction / flow

| Finding | Status |
|---|---|
| **Three redundant "Add API key" affordances** (header + banner + CTA area) | ✅ reduced to two distinct roles: header = status/settings entry; CTA morphs into "Add API key to start" when unblocked-critical |
| Primary CTA looked clickable while disabled (full-color blue) → silent no-op clicks | ✅ replaced by the "Add API key to start" action when unconfigured; disabled state only exists when a real precondition (text length) is missing, with inline hint |
| Right panel pre-filled with pipeline explanation could be mistaken for output | ✅ proper empty state: dashed border, lightning icon, "No output yet" heading, explanation demoted to sub-copy |
| "Get a key →" link wrapped awkwardly inside helper text column | ✅ moved to its own right-aligned line under the key input |
| Cancel button had no affordance (plain ghost text) | ✅ `variant="outline"` |
| No way to re-run after success without re-pasting | ✅ "Re-run" ghost button appears on done |
| Example paste link easy to miss | ✅ promoted to icon+"paste example" button in card header |
| Rounds dropdown unexplained cost/tradeoff | ✅ label tooltip ("more rounds = sharper, more API calls") + "2 (recommended)" option label |
| API-key flow required bottom-left → top-right round trip to unblock | ✅ CTA itself opens settings now |

## Copy / semantics

| Finding | Status |
|---|---|
| "The bullshit"/"paste example" tone inconsistent for first-time users | ⏳ intentional product voice; revisit if used publicly |
| Char counter context-free (no limit shown) | ⏳ no hard limit exists; hint added for <40 chars instead |
| Footer disclaimer low contrast | ✅ |

## A11y

| Finding | Status |
|---|---|
| Icon-only buttons need accessible names | ✅ all have aria-label/title (kumo Button enforces it type-level for square/circle shapes — nice) |
| Confidence bar not machine-readable | ✅ `role="meter"` + aria values |
| Round accordions don't expose expanded state | ✅ `aria-expanded` |
| Focus rings inside modal unclear in screenshots | ⏳ kumo focus-visible styles exist; needs keyboard walkthrough to verify |

## Deferred ideas (not bugs)

- Vertical centering / min-height choreography for tall viewports.
- Light-mode support is free with kumo's `light-dark()` tokens — just toggle
  `data-mode`; a theme switch would be ~10 lines.
- Streaming JSON steps show raw model prose; could pretty-render the ANALYSIS
  section live and hide the JSON block until parsed.
- History of past runs (localStorage) for comparing reconstructions.
- The settings dialog keeps unsaved edits if you press Escape — acceptable,
  but an explicit "unsaved changes" guard would be nicer.
