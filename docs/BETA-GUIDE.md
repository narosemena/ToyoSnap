# ToyoSnap Beta Guide

Welcome to the ToyoSnap beta program. This guide tells you what to test, what's known to be broken, and how to send feedback.

---

## What ToyoSnap does

ToyoSnap records your interactions with a web page — clicks, form fills, navigation — and exports them in multiple formats:

| Export format | What you get |
|---|---|
| PNG chain (ZIP) | One screenshot per step |
| SVG chain (ZIP) | Layered SVG per step |
| HTML Replay | Self-contained interactive replay |
| Video (WebM) | Screen recording |
| Action Log | Plain-text step-by-step log |
| Markdown | `MASTER.md` + per-page files |
| PPTX | PowerPoint slide per step |
| DOCX | Word document |
| MCP JSON | Structured machine-readable log |

Everything is produced locally — nothing leaves your machine.

---

## Getting started: the demo form

To try ToyoSnap without using real work data, use the included demo form:

`tests/fixtures/test-pages/demo-form.html`

Open this file directly in Chrome (`File → Open File`). It simulates an expense submission workflow with realistic form fields. It's safe to capture, export, and share.

---

## What to test

### Core capture flow
1. Open the demo form (or any internal web page you're comfortable capturing)
2. Click the ToyoSnap toolbar icon → **Start Recording**
3. Fill in a few fields, click through the form
4. Click **Stop Recording**
5. Click **Open Vault & Editor**

### Export formats
From the Editor, try each export format and verify the output:
- PNG ZIP — open the zip, confirm screenshots look correct
- SVG ZIP — open an SVG in a browser or design tool
- HTML Replay — open in Chrome, replay the session
- Action Log — check that each step is described

### PII handling (blur / redact)
If you capture a field with sensitive-looking text:
- Right-click a field in the Editor → apply a **blur** or **redact** rule
- Re-export and confirm the sensitive content is no longer visible

### Multi-step navigation
Record a session that spans multiple page loads (e.g. a form that redirects after submission). ToyoSnap should continue recording after the redirect.

---

## Known issues in v0.1.0

| Issue | Workaround |
|---|---|
| iframes (SSO login forms, embedded widgets) are not captured | Use a non-iframe flow for testing |
| `captureVisibleTab` requires the tab to be in the foreground | Keep the recorded tab active while recording |
| Video export may be choppy on low-spec machines | Use PNG chain instead |

---

## Feedback channels

### Internal testers (corp colleagues)
Post in the **#toyosnap-beta** Slack channel. Include:
- The version string from the popup bottom (e.g. `v0.1.0 · abc1234`)
- Steps to reproduce
- What you expected vs what happened

Tag Jira tickets with `toyosnap-beta` for tracking.

### External testers
File a GitHub Issue using the **[Beta Feedback](../../issues/new?template=beta-feedback.yml)** template.

The template will ask for:
- Extension version (from the popup)
- Chrome version
- OS
- Steps to reproduce
- Expected vs actual behavior

---

## What NOT to capture during beta

- Pages with passwords or MFA codes (ToyoSnap masks password fields, but avoid them anyway)
- Pages containing regulated PII (SSNs, financial data) — use the demo form instead
- Internal corp systems marked **Restricted** or above — check with your information security team first

---

## Zero-Egress reminder

ToyoSnap never sends data anywhere. If you open DevTools → Network while recording, you will see zero outbound requests. All exports are generated locally and saved to your machine. See [docs/PRIVACY.md](PRIVACY.md) for details.
