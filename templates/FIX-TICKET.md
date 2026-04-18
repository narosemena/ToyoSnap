# Fix Ticket — [SHORT-DESCRIPTIVE-TITLE]

**Ticket ID:** TS-[YYYY-MM-DD]-[NN]
**Severity:** [ P0 / P1 / P2 / P3 ]
**Reported by:** Round [N] testing — Tester(s) [IDs]
**Assigned to:** Claude Code
**Status:** [ Open / In progress / In review / Merged / Closed ]

---

## User-visible description

One plain-language sentence describing what's broken from the user's perspective.

Example: *"When a tester pauses a recording and resumes, the cursor overlay disappears from the resumed segment in all exports."*

---

## Expected vs. actual

**Expected:**
-

**Actual:**
-

---

## Steps to reproduce

Written so a new contributor could follow without prior context.

1.
2.
3.

**Environment:**
- OS:
- Browser version:
- Extension commit:

---

## Evidence

### Tester quote(s)
> ""

### Occurrence across testers
- Reported by: [ how many of the N testers in this round ]
- First seen: [ Round / Tester / Timestamp in recording if live-observed ]

### Screenshots / recordings
- [Link or filename]

---

## Suggested investigation starting points

These are hypotheses, not instructions. Claude Code should verify before acting.

- Likely files:
  - `src/capture/cursor-tracker.ts`
  - `src/capture/capture-coordinator.ts`
- Likely cause hypothesis:
  -
- Prior related work:
  - [ Commit hash or PR number, if any ]

---

## Acceptance criteria

Fix is complete when:

1. [ ] The specific bug described above no longer reproduces
2. [ ] A new regression test (file: `tests/[suite]/[filename].spec.ts`) exists that fails without the fix and passes with it
3. [ ] All existing suites still pass (`npm run test`)
4. [ ] No new ESLint or type errors introduced
5. [ ] No security invariant weakened (verified by `npm run test:security`)
6. [ ] If user-visible behavior changed, the change is documented in the PR description
7. [ ] `CLAUDE.md` is updated if this fix introduces a new convention or changes project structure

---

## Out of scope for this ticket

Listing these prevents scope creep. If Claude Code thinks any of these are needed, it should STOP and ask before proceeding.

-

---

## Human reviewer checklist (to be completed before merge)

- [ ] The regression test actually reproduces the original bug (verified by reverting the fix and watching the test fail)
- [ ] The fix addresses the root cause, not just the symptom
- [ ] No additional refactoring was snuck into the PR
- [ ] Tester quote is addressed by the fix (not reinterpreted)
- [ ] If the fix required design judgment, I made that judgment myself rather than accepting the AI's default
