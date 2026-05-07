# Prerequisites — Everyone Does This First

Estimated time: 5 minutes.

## 1. Install the extension

1. Download the latest release zip from the GitHub Releases page of this repo.
2. Unzip it to a folder on your desktop (e.g., `toyosnap-0.1.0/`).
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** using the toggle in the top-right corner.
5. Click **Load unpacked** and select the unzipped folder.
6. Confirm ToyoSnap appears in the extensions list with no error badges.

The extension icon (a small camera-like mark) should appear in your Chrome toolbar. If Chrome hides it under the puzzle-piece menu, pin it now — you'll need it throughout the script.

## 2. Open the prescribed test page

Navigate Chrome to:

```
https://narosemena.github.io/ToyoSnap/demo-form.html
```

You should see an "Acme Corp — Expense Submission" form with a yellow notice that reads "This is a ToyoSnap demo page." Leave this tab open.

**Offline fallback:** If you cannot reach the URL above, open `test-pages/demo-form.html` from inside the unzipped release folder via **File > Open File** in Chrome. The page is identical.

## 3. Record your build info

1. Click the ToyoSnap extension icon to open the popup.
2. At the bottom of the popup you will see something like `v0.1.0 · abc1234`.
3. **Click that text** — it copies the string to your clipboard automatically.
4. Paste it somewhere you can refer to later (a sticky note, your results file, etc.).

You will need this string in your bug report. Without it, triage is much harder.

## 4. Open DevTools (Compliance reviewers must do this; others optional)

Open Chrome DevTools on the Acme form tab:

- **Windows/Linux:** `F12` or `Ctrl+Shift+I`
- **macOS:** `Cmd+Option+I`

Click the **Network** tab and check the **Preserve log** checkbox. Leave DevTools open for the duration of your test.

## You are ready

Return to your role-specific script and start at Section A.
