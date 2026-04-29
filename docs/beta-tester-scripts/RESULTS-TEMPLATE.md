# Results Template

Copy the table(s) for your role's sections below, fill them in as you go, and paste the completed tables into your GitHub Issue's "Additional context" field.

## Severity key

| Severity | When to use |
|---|---|
| **Blocker** | Zero-Egress violated, data loss, extension fails to load, real data exposed |
| **Major** | Documented/advertised feature does not work, incorrect behaviour |
| **Minor** | Feature works but is annoying, confusing, or inconsistent |
| **Cosmetic** | Visual glitch only — layout, colour, animation |

---

## How to fill in the table

- **P/F**: write `P` (pass), `F` (fail), or `N/A` (not applicable to your environment).
- **Severity**: only fill in if P/F = `F`. Leave blank for passes.
- **Notes**: for failures, write what actually happened. For passes, notes are optional but helpful (e.g., "Step was slow — 4 s").

---

## Section A — Popup matrix

| # | Step summary | P/F | Severity | Notes |
|---|---|---|---|---|
| A-1 | Popup idle state — all controls present | | | |
| A-2 | Mode dropdown shows 4 options | | | |
| A-3 | Mode selection persists while popup open | | | |
| A-4 | Cursor overlay unchecks | | | |
| A-5 | Start Recording — button/badge change | | | |
| A-6 | Mode dropdown disabled while recording | | | |
| A-7 | Cursor toggle disabled while recording | | | |
| A-8 | Popup reflects recording-start settings | | | |
| A-9 | Stop Recording — button/badge change | | | |
| A-10 | Version footer click-to-copy | | | |
| A-11 | Open Vault & Editor opens new tab | | | |

---

## Section B — Four capture modes

| # | Mode | Session in sidebar | Steps in timeline | Viewer renders correctly | P/F | Severity | Notes |
|---|---|---|---|---|---|---|---|
| B-1 | DOM Replay | | | | | | |
| B-2 | Screenshot Chain | | | | | | |
| B-3 | Video | | | | | | |
| B-4 | SVG Layers | | | | | | |

---

## Section C — Redact panel

| # | Step summary | P/F | Severity | Notes |
|---|---|---|---|---|
| C-1 | Detected elements appear for step 4 | | | |
| C-2 | Blur tool activates | | | |
| C-3 | Click detected element — Applied (1) | | | |
| C-4 | Redact tool activates | | | |
| C-5 | Second element applied — Applied (2) | | | |
| C-6 | Scope dropdown changes to All steps | | | |
| C-7 | Custom selector + Apply button | | | |
| C-8 | Enter key in selector field triggers apply | | | |
| C-9 | Undo button removes last op | | | |
| C-10 | Undo again | | | |
| C-11 | Undo to empty | | | |
| C-12 | Undo with empty stack — disabled | | | |
| C-13 | Redo restores one op | | | |
| C-14 | Redo to full | | | |
| C-15 | Escape clears active tool | | | |
| C-16 | Ctrl/Cmd+Z = Undo | | | |
| C-17 | Ctrl/Cmd+Shift+Z = Redo | | | |
| C-18 | B key = Blur tool | | | |
| C-19 | R key = Redact tool | | | |
| C-20 | G key = toggle scope | | | |
| C-21 | ← = previous step | | | |
| C-22 | → = next step | | | |

---

## Section D — Export matrix

### Sensitivity warning gate

| # | Step summary | P/F | Severity | Notes |
|---|---|---|---|---|
| D-0a | Warning dialog appears on first export | | | |
| D-0b | Export button disabled without checkbox | | | |
| D-0c | Checkbox + Export downloads file | | | |
| D-0d | Second export skips dialog | | | |

### Formats

| # | Format | File downloaded | Opens without error | Content looks correct | P/F | Severity | Notes |
|---|---|---|---|---|---|---|---|
| D-1 | Word Document (.docx) | | | | | | |
| D-2 | PowerPoint (.pptx) | | | | | | |
| D-3 | HTML Replay (.html) | | | | | | |
| D-4 | PNG Screenshots (.zip) | | | | | | |
| D-5 | SVG Layers (.zip) | | | | | | |
| D-6 | Markdown (.md) | | | | | | |
| D-7 | Video (.webm) | | | | | | |
| D-8 | Action Log (.json) | | | | | | |
| D-9 | MCP Package (.json) | | | | | | |

---

## Section E — Keyboard shortcut hint panel

| # | Shortcut | Advertised action | Actual behaviour | P/F | Severity |
|---|---|---|---|---|---|
| E-3 | Ctrl/Cmd+S | Open export panel | | | |
| E-4a | B | Activate Blur tool | | | |
| E-4b | R | Activate Redact tool | | | |
| E-4c | G | Toggle Apply Globally | | | |
| E-4d | ← | Previous step | | | |
| E-4e | → | Next step | | | |

---

## Section F — Bulk Import

| # | Step summary | P/F | Severity | Notes |
|---|---|---|---|---|
| F-1 | Dropzone renders correctly | | | |
| F-2 | Non-image file shows error | | | |
| F-3 | "Import more" resets state | | | |
| F-4 | Click opens file picker | | | |
| F-5 | 3 images import successfully | | | |
| F-6 | Timeline shows 3 alphabetical steps | | | |
| F-7 | Each imported step renders in viewer | | | |
| F-8 | Drag-and-drop adds more steps | | | |

---

## Section G — Purge Memory

| # | Step summary | P/F | Severity | Notes |
|---|---|---|---|---|
| G-1 | Confirm dialog appears | | | |
| G-2 | Cancel leaves data intact | | | |
| G-3 | Second dialog opens | | | |
| G-4 | Purge clears sidebar + live announcement | | | |
| G-5 | IDB stores empty after purge | | | |
| G-6 | New session records after purge | | | |

---

## Section H — Compliance / Security

| # | Step summary | P/F | Severity | Notes |
|---|---|---|---|---|
| H-1a | Network tab: no external requests during recording | | | |
| H-1b | Network tab: no external requests in editor | | | |
| H-1c | Export uses blob URL only | | | |
| H-2a | Service worker DevTools accessible | | | |
| H-2b | CSP = `script-src 'self'; object-src 'self'; connect-src 'self';` | | | |
| H-2c | No unsafe-inline / unsafe-eval in CSP | | | |
| H-3a | Permissions array readable | | | |
| H-3b | Permissions = storage, activeTab, scripting, tabs | | | |
| H-3c | tabCapture absent | | | |
| H-3d | host_permissions = `<all_urls>` | | | |
| H-4 | Password field value masked in captured replay | | | |
| H-5a | IDB internals accessible | | | |
| H-5b | toyosnap database found | | | |
| H-5c/d | Blob store values are encrypted bytes, not plain text | | | |
| H-6 | Session key clears after browser restart | | | |
| H-7a–c | Sensitivity warning blocks export without checkbox | | | |
| H-7d–f | Checkbox enables export; subsequent exports skip dialog | | | |

---

## Tester summary

**Build tested:** <!-- paste v0.1.0 · abc1234 from popup here -->

**Chrome version:** <!-- from chrome://settings/help -->

**OS:**

**Total steps run:**

**Pass:** &nbsp;&nbsp;&nbsp; **Fail:** &nbsp;&nbsp;&nbsp; **N/A:**

**Blockers filed:** (link each GitHub Issue here)

**Majors filed:**

**Minors filed:**

**Cosmetics filed:**
