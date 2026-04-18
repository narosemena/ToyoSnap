# ToyoSnap — Test Strategy

**Owner:** Norman Arosemena
**Last updated:** 2026-04-17
**Status:** Draft for review

---

## 1. What we're testing for

ToyoSnap must satisfy **two distinct audiences** with different acceptance bars. Neither is optional.

| Audience | What they need to believe | How we prove it |
| --- | --- | --- |
| **L&D users** (instructional designers) | "This saves me time and produces usable training artifacts." | Structured end-user testing rounds with real workflows |
| **Enterprise InfoSec auditors** | "This enforces zero-egress, protects PII, and survives adversarial input." | Automated security + unit + e2e suites with coverage thresholds, fuzzing, and evidence trail |

If either audience rejects the tool, we don't ship. These two tracks run in parallel, not sequentially.

---

## 2. Test layers

### Layer 1 — Automated regression (machines catch regressions)

| Suite | Runner | Gates | Failure blocks |
| --- | --- | --- | --- |
| `test:security` | Playwright | Runs first, blocks everything | All other suites |
| `test:unit` | Vitest | 80% line coverage on `src/security`, `src/ledger`, `src/storage`, `src/lib/json-guard`; 60% elsewhere | Build |
| `test:a11y` | axe + Playwright | Zero violations at WCAG 2.2 AA on `popup.html` and `editor.html` | Build |
| `test:e2e` | Playwright (headed via xvfb) | All happy-path flows pass across Chrome stable + Chrome beta | Build |
| `test:contract` (NEW) | Vitest | Each export format produces a file that opens cleanly in its target application | Build |
| `test:fuzz` (NEW) | Vitest + fast-check | 1000+ property-based runs on `json-guard`, `message-validator`, `dom-sanitizer` | Build |
| `test:perf` (NEW) | Playwright with budgets | Editor loads < 2s with 10MB rrweb event stream; export of 5-minute recording < 30s | Warning (does not block, tracked as trend) |

### Layer 2 — End-user testing (humans catch UX failures)

Structured rounds with 3–5 instructional designers per round. Each round = recruit → brief → task execution → feedback capture → triage → fix → next round. See `docs/USER-TESTING-PROTOCOL.md`.

### Layer 3 — InfoSec audit readiness (auditors catch policy gaps)

Evidence package auto-generated on each release tag. See `docs/INFOSEC-EVIDENCE-PACKAGE.md`.

---

## 3. Coverage gaps being closed

These are gaps in the current test suite identified during the 2026-04-17 review:

1. **No coverage thresholds.** A passing suite without thresholds hides under-tested code. Adding Vitest coverage config with per-directory thresholds.
2. **No mutation testing.** Security-critical validators (`isValidSender`, `json-guard`) need adversarial testing beyond hand-written cases. Adding Stryker.
3. **No contract tests on export formats.** A .pptx that "generates" but fails to open in PowerPoint passes current tests. Adding programmatic open-and-parse checks per format.
4. **No fuzzing.** MV3 message-passing is a classic injection surface. Adding fast-check property-based tests.
5. **No performance regression gates.** Editor performance with large rrweb captures is a real failure mode. Adding perf budgets as warnings (non-blocking) with trend tracking.
6. **No end-user testing protocol.** Nothing structured exists today. Adding full protocol with task scripts, feedback forms, and triage process.
7. **No feedback-to-fix handoff format.** Claude Code needs structured input to fix reported issues without inventing requirements. Adding issue template.

---

## 4. Definition of Done

A change is **done** when:

1. All automated suites pass locally and in CI
2. Coverage thresholds are met (not just "tests pass")
3. If the change affects user-facing behavior, it has been dogfooded by the author in a real capture session
4. If the change affects a security invariant, the corresponding security test has been extended, not just kept passing
5. `CLAUDE.md` is updated if the change alters structure or conventions

A **release** is ready when:

1. The last two end-user testing rounds produced zero P0 issues and fewer than 3 P1 issues combined
2. The InfoSec evidence package is green (see `docs/INFOSEC-EVIDENCE-PACKAGE.md`)
3. SBOM is current and all licenses are cleared

---

## 5. What this strategy explicitly does NOT do

- **Does not rely on agents to act as end users.** Agents cannot surface UX confusion, emotional friction, or unexpected workflows.
- **Does not loop "AI tests, AI fixes, AI tests again" without human adjudication.** Every fix from Claude Code must be reviewed by a human before it merges. The loop is Claude Code → human review → merge → test — not Claude Code → test → Claude Code.
- **Does not claim security via test passage alone.** Tests are necessary, not sufficient. The InfoSec evidence package requires artifacts beyond green dots.
