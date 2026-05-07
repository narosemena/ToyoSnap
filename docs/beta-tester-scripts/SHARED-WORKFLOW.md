# Shared Prescribed Workflow — Acme Expense Submission

This 7-step workflow is performed once per capture mode test. Use the exact values below so that every tester's session produces the same steps, making bug reports cross-referenceable.

**Before each run:** confirm the Acme form tab is on the initial state (the yellow-notice form, not the confirmation card). If you see "Expense submitted", click **Submit another expense** to reset.

---

## The 7 steps

| # | Action | Exact value to use | Selector (for PII tests later) |
|---|---|---|---|
| 1 | The Acme form page is loaded in Chrome | — | — |
| 2 | Click the **First name** field and type | `Jane` | `#first-name` |
| 3 | Click the **Last name** field and type | `Smith` | `#last-name` |
| 4 | Click the **Employee ID** field and type | `EMP-12345` | `#employee-id` |
| 5 | Click the **Department** dropdown and select | `Engineering` | `#department` |
| 6 | Click the **Amount (USD)** field and type | `199.99` | `#amount` |
| 7 | Click **Submit expense** | — | `button.btn-primary` |

**Expected result after step 7:** The form card slides away and a confirmation card appears showing "Expense submitted" and a reference number like `EXP-XXXXXX`.

---

## How to start and stop a recording

1. While the Acme form tab is active, click the ToyoSnap extension icon.
2. Confirm the **Capture mode** dropdown shows the mode you want for this run.
3. Click **Start Recording**. The popup shows a red **REC** badge. Close the popup.
4. Perform the 7 steps above.
5. Click the ToyoSnap icon again and click **Stop Recording**. The REC badge disappears.
6. Click **Open Vault & Editor** to review what was captured.

---

## What to look for in the editor after recording

After clicking "Open Vault & Editor", the editor opens in a new tab. Within a few seconds you should see:

- The session you just recorded in the **left sidebar** (labelled with the mode and timestamp).
- A **timeline strip** at the top of the main area showing numbered step thumbnails.
- The **right panel** with three tabs: **Redact**, **Export**, **Import**.

If the sidebar shows "No sessions yet", the recording did not save. File a Blocker bug.
