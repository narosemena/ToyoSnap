# ToyoSnap — End-User Testing Protocol

**For:** Instructional designers (target users). Internal colleagues and external peers both eligible.

---

## 1. Why this exists

Automated tests cannot answer three questions that decide whether ToyoSnap ships:

1. **Does this actually save L&D professionals time versus their current workflow?**
2. **Are the generated artifacts usable in the learner-facing deliverables they already produce?**
3. **Where do real users get confused, frustrated, or give up?**

Only humans doing real work can answer these. Agents cannot.

---

## 2. Structure: rounds, not continuous testing

Testing runs in **discrete rounds of 3–5 testers**, not rolling continuous feedback. Rolling feedback contaminates: testers normalize to quirks, and you can't tell which fix actually helped because there's no A/B to compare.

| Round | Testers | Focus | Duration |
| --- | --- | --- | --- |
| Round 1 | 3 testers, mixed experience | Broad discovery. Find the obvious breaks. | 1 week |
| (Fix cycle) | — | Triage and close P0/P1 from Round 1 | 1–2 weeks |
| Round 2 | 3 **new** testers | Verify fixes, find next layer of issues | 1 week |
| (Fix cycle) | — | Triage and close | 1–2 weeks |
| Round 3 | 4–5 testers, targeted scenarios | Pre-ship confidence check | 1 week |

**Recruitment rule: never reuse testers across consecutive rounds.** A tester who's already used the tool cannot tell you what a first-time user will experience.

**Stopping rule:** Ready to ship when a round produces **zero P0 issues and ≤3 P1 issues** and the P1s are acceptable-risk by your judgment.

---

## 3. Tester recruitment

Target profile:
- Practicing instructional designer, L&D professional, or adjacent (LXD, training developer, CLO staff)
- Uses a Chromium browser daily
- Has built at least one eLearning course, job aid, or software walkthrough in the last 12 months
- Mixed tool familiarity: 1 newer-to-L&D, 1–2 mid-career, 1 senior

Avoid:
- Anyone who helped build ToyoSnap or who has seen its internals
- Anyone you've tested a prior round with in the last 30 days

Compensation: if external, offer a meaningful thank-you (gift card, peer mention, training voucher). If internal, offer to return the favor on their own project.

---

## 4. The tester brief (one page; send in advance)

Template lives at `templates/TESTER-BRIEF.md`. Contains:

- What ToyoSnap is (two sentences, plain language, no jargon)
- What you're asking them to do (task list at a high level)
- Time commitment (45–60 minutes)
- How feedback will be used
- Privacy note: the tool runs entirely on their machine; nothing leaves it. But recordings they make may contain their own data — they should capture non-sensitive workflows only.
- Consent to record the session if observed live

---

## 5. Task scripts

Each tester runs through a **fixed script of scenarios**, worded in user language, not feature language.

### Scenario 1 — Installation and first capture
> "Imagine a new coworker just sent you this extension to try. Install it, then use it to record yourself completing any simple task on any website you choose — maybe searching for something, filling a form, navigating a site. Stop when you feel you've captured enough for a short training clip."

**What we're learning:** Install friction, first-run confusion, start/stop intuitiveness, does the zero-egress pitch land.

### Scenario 2 — Export a training-ready artifact
> "Take the recording you just made and export it as something you could hand to a learner. Pick whichever format makes sense to you. Open the exported file and tell me if it looks like something you'd actually use in a course."

**What we're learning:** Which exports resonate, which look broken, whether output quality matches their standards.

### Scenario 3 — Recapture with a correction
> "You noticed a mistake in the recording. Without starting from scratch, fix it and re-export. Talk me through how you'd expect to do this."

**What we're learning:** Is the editor discoverable? Do users find the override/edit flow? Is recapture obvious or hidden?

### Scenario 4 — Sensitive-data workflow
> "Record yourself filling out a login form (use fake credentials). Then open the exported video or image chain and check whether the password is visible."

**What we're learning:** Is the password-masking trust signal clear? Do users verify it or just trust the claim?

### Scenario 5 — The design system doc
> "Open the auto-generated design system document from your capture. Tell me what it is, what you'd use it for, and whether it would be more useful to you than what you produce manually today."

**What we're learning:** Is this feature understood? Valued? Or confusing noise?

### Scenario 6 — Unscripted exploration
> "You have 10 minutes to use it however you want. Try to break it, or try a workflow you genuinely want to capture for your real work. Think aloud."

**What we're learning:** What we didn't script. This is often where the most valuable findings come from.

---

## 6. Feedback capture

Two channels, both required:

### A) Live observation (if feasible)
- Moderator watches via screen share or in person
- Takes notes using `templates/OBSERVATION-LOG.md`
- Records session (with consent) for later review
- Does NOT help the tester unless they are completely blocked
- Every moment of confusion, hesitation, or surprise is a data point

### B) Structured post-task form
- Completed by the tester after the session
- Template: `templates/FEEDBACK-FORM.md`
- Per-scenario: task completion (yes / partial / no), difficulty 1–5, where stuck, quote
- Overall: net promoter-style "would you use this on your next project?", most-wanted-fix, surprising-moment

---

## 7. Triage — the critical step

After each round, the moderator (you) triages every piece of feedback into a severity bucket **before** handing anything to Claude Code.

| Severity | Definition | Action |
| --- | --- | --- |
| **P0** | Blocks shipping. Security invariant broken. Core flow non-functional. Data loss. | Fix before next round; no exceptions |
| **P1** | Materially hurts UX. Primary flow is annoying or confusing for most testers. Export quality unacceptable. | Fix before next round if possible |
| **P2** | Polish issue. Minor confusion. Wouldn't stop a user from shipping their work. | Backlog; fix between rounds if cheap |
| **P3** | Feature request or stylistic preference. | Backlog; may never ship |
| **W** | Won't fix. Out of scope or conflicts with a security invariant. | Documented with rationale |

**Count duplicates.** If 3 of 5 testers flagged the same confusion, that is a P1 at minimum regardless of individual severity. Pattern > severity of single report.

**Do not let Claude Code triage.** This is a human judgment call. Claude Code fixes what you tell it to fix.

---

## 8. Handoff to Claude Code

Each P0/P1 becomes a fix ticket using `templates/FIX-TICKET.md`. The ticket includes:

- User-visible description of the bug
- Expected vs actual behavior
- Steps to reproduce (written so a new contributor could follow)
- Which tester(s) reported it and their verbatim quote
- Severity and rationale
- Suggested files to start investigation (your hypothesis, not Claude's)
- Required: a new regression test that would catch this bug

Claude Code is instructed (via `CLAUDE.md`) to:
1. Read the fix ticket
2. Reproduce the bug locally if possible
3. Write the failing test first
4. Fix the code
5. Confirm the test passes and no other tests regressed
6. Open a PR referencing the ticket

**You review the PR before merging.** No auto-merge. This is the step that makes the difference between "AI helped me fix things" and "AI broke things in a way I didn't notice."

---

## 9. What good looks like, round by round

| Round | Typical P0 count | Typical P1 count | Typical P2+ count |
| --- | --- | --- | --- |
| Round 1 | 2–4 | 5–10 | 10–20 |
| Round 2 | 0–1 | 3–6 | 5–15 |
| Round 3 | 0 | 0–3 | Trickle |

If Round 2 produces more P0/P1s than Round 1, something regressed — stop and investigate before Round 3.

---

## 10. What this protocol deliberately avoids

- **No agent-as-tester.** See strategy doc, section 5.
- **No rolling feedback.** Rounds only.
- **No A-B asking testers what they'd prefer between designs.** Testers tell you what broke; you decide what to change.
- **No moderator intervention during tasks unless fully stuck.** Helping contaminates the data.
- **No triage by committee.** One moderator owns severity calls per round.
