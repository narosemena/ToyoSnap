# ToyoSnap — Developer Dogfood Test Script

**Purpose:** Pre-Round 1 self-test. Find P0/P1 issues before recruiting external testers.  
**Environment:** Built extension loaded unpacked in Chrome. Use any non-sensitive public website (e.g. wikipedia.org, example.com).  
**Result codes:** ✅ pass | ❌ fail (describe what happened) | ⚠️ observation (not broken, but worth noting)

---

## Block A — Popup & Capture Start

**A1. Popup renders clean**  
Open the extension popup.  
Expected: Mode selector shows "Screenshot Chain" selected, Image format toggle shows PNG/JPEG, Cursor toggle is OFF by default, Record button is enabled.

**A2. Format selector only appears for Screenshot Chain**  
In the popup, switch mode to SVG.  
Expected: Image format toggle disappears. Switch back to Screenshot Chain — it reappears.

**A3. Controls lock during recording**  
Start a PNG screenshot chain recording. While recording is active, try clicking the mode selector and format toggle.  
Expected: Both are disabled/unresponsive. Record button changes to Stop.

**A4. JPEG capture start**  
Stop if recording. Set format to JPEG. Start recording. Click around the page 3 times. Stop.  
Expected: No error. Session created.

**A5. PNG capture start**  
Set format back to PNG. Start a new recording. Click 3 times. Stop.  
Expected: No error. Second session created independently of the first.

---

## Block B — Editor: Session & Step Loading

**B1. Both sessions appear in the session list**  
Open the editor.  
Expected: Two sessions listed. Clicking each one loads its steps in the timeline.

**B2. Step count matches clicks**  
Select each session. Count the steps in the timeline strip.  
Expected: Each session shows (clicks + 1) steps — the initial capture plus one per click.

**B3. First step is always present**  
Select either session and look at Step 1.  
Expected: Step 1 exists and shows the page state at the moment recording started — not blank, not an error.

**B4. Step switching**  
Click through each step in the timeline.  
Expected: The viewer updates to show the correct screenshot for each step. No flicker or blank frames.

---

## Block C — Step Viewer: Image Quality & Zoom

**C1. PNG vs JPEG visual quality**  
Switch between the PNG session and JPEG session and compare the same type of page content.  
Expected: PNG is sharper/lossless. JPEG is visibly compressed on fine text but acceptable. Neither is corrupted or blank.

**C2. Zoom in**  
With a screenshot step selected, click the **+** zoom button several times.  
Expected: Image scales up. A scrollable viewport appears. You can pan by scrolling. The percentage label updates (25% increments: 100% → 125% → 150%…).

**C3. Zoom boundaries**  
Zoom out past 25% — the − button should disable. Zoom in to 400% — the + button should disable.  
Expected: Buttons grey out at limits; clicking a disabled button does nothing.

**C4. Reset zoom**  
While zoomed in, click "Reset".  
Expected: Returns to 100%. Reset link disappears (only visible when zoom ≠ 100%).

**C5. Zoom resets on step change**  
Zoom to 200%. Click a different step in the timeline.  
Expected: Zoom returns to 100% automatically.

**C6. SVG step renders**  
If you have an SVG session: select it and click through its steps.  
Expected: SVG renders with correct aspect ratio. No zoom controls shown for SVG steps.

---

## Block D — Step Labels (Inline Edit)

**D1. Default label shows page title**  
Select any step.  
Expected: Header shows "Step N — [page title from capture]". If title was blank at capture time, shows italicised "Untitled".

**D2. Click to edit**  
Click on the step label text (the page title part, not "Step N").  
Expected: Label becomes an editable text input, pre-filled with current value, text selected.

**D3. Commit with Enter**  
Change the label text and press Enter.  
Expected: Label updates immediately in the header. Change persists if you navigate away and back to the step.

**D4. Commit with blur**  
Edit the label, then click somewhere else on the page.  
Expected: Same as Enter — change commits.

**D5. Cancel with Escape**  
Start editing, type some text, then press Escape.  
Expected: Input closes. Label reverts to what it was before you started editing — your typed text is discarded.

**D6. Re-open after Escape shows original**  
Immediately click the label again after pressing Escape.  
Expected: Input opens with the original (pre-edit) value, not the text you typed before pressing Escape.

---

## Block E — PII Redaction

**E1. Blur tool**  
Select a screenshot step. In the right panel, activate the Blur tool. Drag a rectangle over a region of the image.  
Expected: A blue semi-transparent overlay appears on the region. A "drag to blur a region" hint was visible before you started dragging.

**E2. Redact tool**  
Activate the Redact tool. Drag a rectangle over a different region.  
Expected: A dark overlay appears.

**E3. Overlays are step-scoped**  
After adding a blur to Step 2, switch to Step 3.  
Expected: The blur overlay from Step 2 does NOT appear on Step 3.

**E4. SVG step shows notice, not tools**  
If you have an SVG step: select it and look at the PII panel.  
Expected: A notice explains that SVG redaction works differently (not drag-to-redact). No crosshair cursor on the SVG.

---

## Block F — Export

**F1. PNG session → only PNG export option**  
Select the PNG screenshot session. Open the Export tab.  
Expected: "PNG Screenshots" is available. "JPEG Screenshots" is NOT listed.

**F2. JPEG session → only JPEG export option**  
Select the JPEG screenshot session. Open the Export tab.  
Expected: "JPEG Screenshots" is available. "PNG Screenshots" is NOT listed.

**F3. Export PNG zip — clean file**  
From the PNG session, export as PNG zip. Open the downloaded zip.  
Expected: One PNG file per step, named sensibly. All images open without error. Images are not blank.

**F4. Export JPEG zip — clean file**  
From the JPEG session, export as JPEG zip. Open the downloaded zip.  
Expected: One JPEG file per step. All images open. Files are smaller than PNG equivalents would be.

**F5. PII overlays baked into export**  
Add a blur overlay to a step. Export as PNG (or JPEG). Open the exported image for that step.  
Expected: The blur is physically present in the exported image — baked in, not just a UI overlay. The original content under the blur is not recoverable from the file.

**F6. SVG export**  
Select an SVG session. Export as SVG zip.  
Expected: One SVG file per step. Files open in a browser and render correctly.

---

## Block G — Session Management & Purge

**G1. Delete a single session**  
In the session list, delete one of the two sessions.  
Expected: Session removed from list. Steps panel clears. Other session unaffected.

**G2. Purge all memory**  
Click "Purge Memory" (top of the left panel). Confirm.  
Expected: All sessions gone. Steps panel empty. Editor shows empty state. Button does not get stuck — returns to normal state immediately after purge.

**G3. State after purge is clean**  
After purging, open the popup and start a new recording.  
Expected: New session created, shows up in editor normally. No ghost data from the purged sessions.

---

## Block H — Stability & Edge Cases

**H1. Rapid step clicking**  
With 5+ steps loaded, click through the timeline as fast as you can.  
Expected: No blank frames, no errors, no frozen panel.

**H2. Long step label**  
Edit a step label to a very long string (100+ characters).  
Expected: Label truncates in the header display but the full text is stored and shown in the edit field.

**H3. Empty label**  
Edit a step label, clear it entirely, press Enter.  
Expected: Either reverts to original title or shows "Untitled" — does not crash or show an empty broken header.

**H4. Extension popup while editor is open**  
With the editor open, open the popup and start a new recording without closing the editor.  
Expected: No crash in either window. New session eventually appears in editor after stopping and refreshing.
