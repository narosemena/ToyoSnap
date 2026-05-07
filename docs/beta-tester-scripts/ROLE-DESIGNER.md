# Tester Script — Instructional Designer

This script is for the intended end-user of ToyoSnap: an instructional designer or documentation author who wants to capture workflows and export them into course materials.

You do **not** need developer knowledge. If a step asks you to do something that requires technical skills not described here, note it as a finding.

**Before starting:** Complete [PREREQUISITES.md](PREREQUISITES.md).

**Estimated time:** ~40 minutes.

**Feedback table:** Copy the blank table from [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md) and fill it in as you go.

---

## Section A — Popup orientation

*Goal: confirm the popup is self-explanatory to a first-time user.*

| # | Step | Expected result |
|---|---|---|
| A-1 | Click the ToyoSnap extension icon for the first time | A small panel opens showing "ToyoSnap" at the top, a "Capture mode" dropdown, a checkbox labelled "Show cursor overlay", a blue "Start Recording" button, and a blue link "Open Vault & Editor" at the bottom |
| A-2 | Read each label in the popup without clicking anything | All labels are clear without documentation. If any label is confusing, write down exactly which one in your notes |
| A-3 | Click the "Capture mode" dropdown and read each option | Four options appear: "DOM Replay", "Screenshot Chain", "Video", "SVG Layers". If any name is unclear, note it |
| A-4 | Select **Screenshot Chain** from the dropdown | The dropdown value updates. The button still reads "Start Recording" |
| A-5 | Click the version text at the very bottom of the popup (e.g., `v0.1.0 · abc1234`) | Nothing visible changes in the popup, but the text has been copied to your clipboard. Paste it into a text editor to confirm |

---

## Section B — Recording a workflow (Screenshot Chain)

*Run the full 7-step workflow in Screenshot Chain mode.*

| # | Step | Expected result |
|---|---|---|
| B-1 | With "Screenshot Chain" selected, click **Start Recording** | The button turns red and reads "Stop Recording". A red **REC** badge appears in the top-right of the popup. Close the popup |
| B-2 | Perform all 7 steps from [SHARED-WORKFLOW.md](SHARED-WORKFLOW.md) | The Acme form tab remains fully functional. No alert or slowdown is noticeable |
| B-3 | After step 7 (confirmation card appears), re-open the popup | The REC badge is still visible. The "Capture mode" dropdown and "Show cursor overlay" checkbox are greyed out |
| B-4 | Click **Stop Recording** | The button returns to blue "Start Recording". The REC badge disappears |
| B-5 | Click **Open Vault & Editor** | A new Chrome tab opens showing the ToyoSnap editor |
| B-6 | In the editor, look at the left sidebar | Your session appears, labelled with the mode and a timestamp. Selecting it shows thumbnails in the timeline strip across the top |
| B-7 | Click each numbered thumbnail in the timeline | The main area updates to show that step's content. Each click feels immediate (no loading spinner lasting more than 2 seconds) |

---

## Section C — Redact panel (basic PII flow)

*Goal: confirm a first-time user can apply a redaction without documentation.*

| # | Step | Expected result |
|---|---|---|
| C-1 | In the editor, click the **Redact** tab on the right panel | The panel shows a toolbar with "Blur" and "Redact" buttons, a "Scope" dropdown, and "Undo" / "Redo" buttons |
| C-2 | Click the thumbnail for step 4 (Employee ID was entered) | The main area shows that step. Under "Detected elements" in the Redact panel, at least one element appears |
| C-3 | Click the **Blur** button in the tool bar so it becomes highlighted | "Blur" button turns blue/active |
| C-4 | Click one of the detected element rows | The row shows "Applied" and an entry appears under "Applied (1)" at the bottom of the panel |
| C-5 | Click **Undo** | The "Applied" count returns to 0. The element row no longer shows "Applied" |
| C-6 | Click **Redo** | The operation is reapplied. "Applied (1)" returns |
| C-7 | In your notes, answer: *Was it clear what "Blur" vs "Redact" would do without reading documentation?* | (Free-text UX observation — no Pass/Fail) |

---

## Section D — Export two formats

*Goal: confirm at least two exports produce usable files.*

| # | Step | Expected result |
|---|---|---|
| D-1 | Click the **Export** tab on the right panel | A grid of 9 export buttons appears, each showing a format name and file extension |
| D-2 | Click **Word Document** (.docx) | A dialog appears: "Sensitive data warning" with a checkbox "I understand — don't show again for this session" |
| D-3 | Read the warning text and check the checkbox | The "Export" button inside the dialog becomes active |
| D-4 | Click **Export** inside the dialog | A `.docx` file downloads to your Downloads folder. The dialog closes |
| D-5 | Open the downloaded `.docx` in Microsoft Word or another word processor | The document opens without error and contains at least one step section |
| D-6 | Back in the editor, click **PNG Screenshots** | The file downloads immediately (no dialog — the "don't show again" checkbox suppressed it) as a `.zip` |
| D-7 | Open the `.zip` and confirm it contains PNG images | Each image corresponds to one step. The count of images matches the number of thumbnails in the timeline |
| D-8 | In your notes, answer: *Did the exported files look usable for your workflow (course material, documentation, etc.)?* | (Free-text UX observation — no Pass/Fail) |

---

## Section E — UX questionnaire

Answer these questions in your results notes. There is no Pass/Fail — these are qualitative signals.

1. Before starting, did you understand what ToyoSnap was supposed to do just from the popup labels? If not, what was confusing?
2. When the recording was running, how did you know ToyoSnap was actually capturing your actions (not just running silently)?
3. After stopping the recording, did you know how to find and review your captured steps without being told? If not, where did you get stuck?
4. Were the "Redact" panel labels ("Blur", "Redact", "Scope", "This step only", "All steps") immediately understandable? If not, which ones were unclear?
5. Would you want to use ToyoSnap in your actual workflow? What's the one thing that would most improve your confidence?

---

## Done

File your results:

1. Complete the Pass/Fail table (copy from [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md)).
2. Add your UX questionnaire answers to the "Additional context" field.
3. Open a **Beta Feedback** GitHub Issue in this repo and paste everything in.
4. Include the build string from step A-5 in the "Extension version" field.
