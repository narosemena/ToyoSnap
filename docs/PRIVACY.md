# Privacy & Data Handling

## The short version

ToyoSnap is a **Zero-Egress** tool. Everything it captures stays on your machine. Nothing is sent to any server, cloud service, or third party — ever.

---

## What ToyoSnap captures

When you start a recording session, ToyoSnap captures:

- **DOM events** (clicks, form inputs, page navigation) using the `rrweb` library
- **Screenshots** of the visible browser viewport at each step
- **Page metadata** (URL, page title, timestamp)

It does **not** capture:
- Password field contents (`maskInputOptions: { password: true }` is always enforced)
- Content from other browser tabs
- Content from iframes served by third-party origins
- Audio or microphone input
- Your browser history outside the recorded tab

---

## Where data is stored

All captured data is stored in **Chrome's IndexedDB** (`toyosnap` database) in your local browser profile.

Every blob (screenshot, DOM recording) is **AES-GCM 256-bit encrypted** before being written to disk. The encryption key is generated fresh each time Chrome starts and lives only in `chrome.storage.session` — it's memory-only and is automatically deleted when you close the browser.

This means:
- Your recordings are not accessible to other Chrome extensions
- Your recordings are not accessible to websites you visit
- If you close Chrome, the session key is gone — recordings remain on disk, encrypted, readable again when Chrome restarts and re-derives the key

---

## What leaves your machine

**Nothing.**

The extension's Content Security Policy is set to `connect-src 'self'`, which prevents any network request to an external host. This is enforced at the browser level, not just in code — it cannot be bypassed by a bug in ToyoSnap.

You can verify this yourself:
1. Open DevTools (F12) → Network tab
2. Start a ToyoSnap recording session
3. Observe: zero outbound requests

---

## Exports

When you export a session, the output file is saved to your local Downloads folder (or wherever your browser saves files). Exports are not uploaded anywhere.

If you share an export file (e.g. attach it to a ticket or email), that is your choice — ToyoSnap does not transmit it on your behalf.

---

## Uninstalling

Removing the ToyoSnap extension from Chrome (`chrome://extensions` → Remove) also deletes all IndexedDB data. Exports you already saved to disk are not affected.

---

## Contact

Questions about privacy? File a GitHub Issue or contact the maintainer via the channels listed in [docs/SECURITY.md](SECURITY.md).
