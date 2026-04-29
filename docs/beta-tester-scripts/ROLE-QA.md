# Tester Script — Internal QA Engineer

Full matrix coverage. Run everything. If a step is already covered by an automated test suite, still run it manually — automated tests verify code paths, not user-visible behaviour.

**Before starting:** Complete [PREREQUISITES.md](PREREQUISITES.md). Keep DevTools → Network tab open.

**Estimated time:** ~75 minutes.

**Feedback table:** Copy the blank table from [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md) and fill it in as you go.

---

## Section A — Popup matrix

*Test every control in the popup in both recording and idle states.*

| # | Step | Expected result |
|---|---|---|
| A-1 | Open the popup with no active recording | Shows: "ToyoSnap" header, "Capture mode" label + dropdown, "Show cursor overlay" checkbox (checked by default), blue "Start Recording" button, "Open Vault & Editor" link, version footer |
| A-2 | Click the "Capture mode" dropdown | Four options: "DOM Replay", "Screenshot Chain", "Video", "SVG Layers" |
| A-3 | Select each option in turn and re-open the popup | The selected value persists while the popup stays open |
| A-4 | Uncheck "Show cursor overlay" | Checkbox becomes unchecked. Value persists while popup stays open |
| A-5 | Click **Start Recording** | Button turns red, label changes to "Stop Recording", a red **REC** badge appears top-right, popup can be closed |
| A-6 | While recording: open the popup and attempt to change the Capture mode dropdown | Dropdown is disabled (visually greyed, unresponsive) |
| A-7 | While recording: attempt to change the "Show cursor overlay" checkbox | Checkbox is disabled |
| A-8 | While recording: note which mode and cursor-state are shown | UI reflects the values used when recording started, not the local defaults |
| A-9 | Click **Stop Recording** | Button returns to blue "Start Recording", REC badge disappears |
| A-10 | Click the version footer text (e.g., `v0.1.0 · abc1234`) | Nothing visible in popup; paste into a text editor to confirm the clipboard contains `v0.1.0 · <7-char-hash>` |
| A-11 | Click **Open Vault & Editor** | New tab opens to the editor page |

---

## Section B — Four capture modes (run Section A of SHARED-WORKFLOW.md four times)

For each mode, record the full 7-step Acme workflow from [SHARED-WORKFLOW.md](SHARED-WORKFLOW.md), then open the editor and verify.

| # | Mode | Expected result in editor |
|---|---|---|
| B-1 | **DOM Replay** | Session appears; step viewer shows an interactive rrweb replay (page DOM visible, not a screenshot) |
| B-2 | **Screenshot Chain** | Session appears; each step thumbnail shows a screenshot image |
| B-3 | **Video** | Session appears; step viewer shows a video player element |
| B-4 | **SVG Layers** | Session appears; step viewer shows an SVG representation of the page |

For B-1 through B-4, also verify:
- The session in the sidebar is labelled with the correct mode name and a readable timestamp.
- The timeline strip shows thumbnails for each of the 7 steps.
- Clicking a thumbnail updates the main step viewer.

---

## Section C — Redact panel (full PII matrix)

Use the DOM Replay session from B-1. Click the **Redact** tab on the right panel.

| # | Step | Expected result |
|---|---|---|
| C-1 | Click the step 4 thumbnail (Employee ID was typed) | Redact panel shows "Detected elements" with at least one row (the clicked or targeted element from that step) |
| C-2 | Click **Blur** in the tool bar | "Blur" button becomes active (blue background, `aria-pressed="true"`) |
| C-3 | Click a detected element row | Row shows "Applied". "Applied (1)" counter appears at the bottom |
| C-4 | Click **Redact** in the tool bar | Blur deactivates, Redact activates |
| C-5 | Click a different detected element row | "Applied (2)" at the bottom. The first entry shows "blur" badge, the second shows "redact" badge |
| C-6 | Change the "Scope" dropdown to **All steps** | Dropdown value updates |
| C-7 | Type `#employee-id` into the Custom CSS selector field and click **Apply** | "Applied (3)". The new entry shows `(global)` tag next to the selector |
| C-8 | Press **Enter** in the custom selector field with a different value (e.g., `#amount`) | Same behaviour as clicking Apply — entry added |
| C-9 | Click **Undo** | The last operation is removed. Applied count decreases by 1 |
| C-10 | Click **Undo** again | Count decreases by 1 again |
| C-11 | Click **Undo** until count is 0 | All operations removed. "Applied" section disappears |
| C-12 | Click **Undo** with empty stack | Undo button is disabled; nothing happens |
| C-13 | Click **Redo** | One operation reapplied |
| C-14 | Click **Redo** until the Redo button is disabled | All operations restored to the state before the first Undo |
| C-15 | Press **Escape** | Active tool (Blur or Redact) deactivates; neither button shows active state |
| C-16 | Press **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (macOS) | Same as clicking Undo — last operation removed |
| C-17 | Press **Ctrl+Shift+Z** (Windows/Linux) or **Cmd+Shift+Z** (macOS) | Same as clicking Redo |
| C-18 | Press **B** on the keyboard | **Expected per the keyboard shortcut hint:** Blur tool activates. **File as Major if it does not.** Note verbatim what happened |
| C-19 | Press **R** on the keyboard | **Expected:** Redact tool activates. File as Major if not |
| C-20 | Press **G** on the keyboard | **Expected:** Scope dropdown toggles between "This step only" and "All steps". File as Major if not |
| C-21 | Press **←** (left arrow) | **Expected:** active step moves to the previous thumbnail. File as Major if not |
| C-22 | Press **→** (right arrow) | **Expected:** active step moves to the next thumbnail. File as Major if not |

---

## Section D — Export matrix (all 9 formats)

Use the DOM Replay session from B-1. Click the **Export** tab.

First export triggers the sensitivity warning gate:

| # | Step | Expected result |
|---|---|---|
| D-0a | Click any export format | "Sensitive data warning" modal appears |
| D-0b | Attempt to click **Export** in the dialog **without** checking the checkbox | Export button is disabled; nothing downloads |
| D-0c | Check "I understand — don't show again for this session", then click **Export** | File downloads; dialog closes |
| D-0d | Click a second export format | No dialog — suppressed for the session |

Then test each format:

| # | Format label | Extension | Pass criteria |
|---|---|---|---|
| D-1 | **Word Document** | `.docx` | Downloads; opens in Word/LibreOffice with step content |
| D-2 | **PowerPoint** | `.pptx` | Downloads; opens in PowerPoint/Impress; one slide per step |
| D-3 | **HTML Replay** | `.html` | Downloads; open in a fresh browser tab — rrweb-player renders with no outbound network requests visible in DevTools |
| D-4 | **PNG Screenshots** | `.zip` | Downloads; unzip contains N PNG files (one per step) |
| D-5 | **SVG Layers** | `.zip` | Downloads; unzip contains step folders, each with SVG files |
| D-6 | **Markdown** | `.md` | Downloads; open as plain text — readable step-by-step structure |
| D-7 | **Video** | `.webm` | Downloads; plays in Chrome or VLC |
| D-8 | **Action Log** | `.json` | Downloads; valid parseable JSON |
| D-9 | **MCP Package** | `.json` | Downloads; valid parseable JSON; top-level keys match MCPLog schema v1.0 |

Also verify:
- While any export is running, other export buttons show disabled state (spinner on the running one, others greyed).
- On completion, buttons return to normal state.
- If an export fails, an error message is shown inline (red text above the grid).

---

## Section E — Keyboard shortcut hint panel

| # | Step | Expected result |
|---|---|---|
| E-1 | In the editor left sidebar, click **Keyboard shortcuts** (the small keyboard icon or link at the bottom) | A panel expands listing 8 shortcuts |
| E-2 | Verify the panel lists: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Escape, Ctrl/Cmd+S, ←/→, B, R, G | All 8 rows are present |
| E-3 | Press **Ctrl/Cmd+S** | The "Sensitive data warning" export dialog opens (or the Export tab activates) |
| E-4 | For each of B, R, G, ←, → — attempt the shortcut and record what happens | Note verbatim. Any shortcut that is listed in the panel but does not function is a **Major** finding |

---

## Section F — Bulk Import

Click the **Import** tab in the right panel.

| # | Step | Expected result |
|---|---|---|
| F-1 | Observe the import dropzone | Shows "Drop images here or click to select" with a dashed border, and a hint "PNG, JPG, WebP — sorted alphabetically into steps" |
| F-2 | Drag and drop a `.txt` file onto the dropzone | Status changes to error: "No image files found. Drop PNG, JPG, or WebP images." |
| F-3 | Click "Import more" | Dropzone resets to idle state |
| F-4 | Click the dropzone (not drag-and-drop) | File picker opens, filtered to image types |
| F-5 | Select 3 PNG images from your system | Status shows "Importing 3 images…", then "Import complete (3 steps)" |
| F-6 | Observe the timeline strip | 3 new step thumbnails appear, labelled with the image filenames. They appear in alphabetical filename order |
| F-7 | Click each imported step thumbnail | The step viewer renders the imported image |
| F-8 | Drag and drop 1 more image onto the dropzone | Import adds 1 more step. Timeline now shows the original steps plus 4 imported total |

---

## Section G — Purge Memory

| # | Step | Expected result |
|---|---|---|
| G-1 | Click **Purge Memory** in the top-right of the editor sidebar | A confirmation dialog appears: "Purge all captured data?" with description "This will permanently delete all captured sessions and cannot be undone." |
| G-2 | Click **Cancel** | Dialog closes; all sessions remain intact |
| G-3 | Click **Purge Memory** again | Dialog reappears |
| G-4 | Click **Purge** | Dialog closes; sidebar shows "No sessions yet"; main area shows "No session selected"; the screen reader/ARIA live region announces "All captured data has been purged" |
| G-5 | Open `chrome://indexeddb-internals`, find the `toyosnap` database, and inspect the `sessions` and `blobs` stores | Both stores are empty |
| G-6 | Re-record a short session (just the first 2 steps of the Acme workflow) | New session appears in the sidebar — confirms IDB and state were properly reset |

---

## Section H — Mid-session popup state regression

This is a specific regression guard: the popup must accurately reflect state set at recording start, not local defaults.

| # | Step | Expected result |
|---|---|---|
| H-1 | Open the popup, set mode to "SVG Layers", uncheck "Show cursor overlay", then click **Start Recording** | REC badge appears |
| H-2 | Without stopping, close and re-open the popup multiple times | Each time: mode shows "SVG Layers" (not "DOM Replay"), "Show cursor overlay" is unchecked, button reads "Stop Recording" |
| H-3 | Navigate to another tab, then click back to the Acme tab and re-open the popup | Same state — mode and cursor setting preserved |
| H-4 | Stop recording, then open the popup | Mode and cursor settings can now be changed; they reset to their defaults (or last local selection) |

---

## Done

File your results:

1. Complete the Pass/Fail table (copy from [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md)).
2. For every Major or Blocker, open a separate **Beta Feedback** GitHub Issue with a focused title. Link them from the main summary issue.
3. Include the build string from Section A-10 in every issue's "Extension version" field.
