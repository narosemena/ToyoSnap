# Installing ToyoSnap (Beta)

ToyoSnap is distributed as a zip file that you load directly into Chrome. No Chrome Web Store listing is required.

---

## Requirements

- Google Chrome 120 or later (Manifest V3 support)
- Developer mode enabled (one-time, takes 5 seconds)

---

## Step-by-step

### 1. Download the release

Go to the [Releases page](../../releases) and download the latest `toyosnap-v*.zip` asset.

### 2. Unzip

Extract the zip to a permanent folder — Chrome needs this folder to stay in place after you load it.

**Windows:** Right-click → Extract All  
**macOS:** Double-click  
**Linux:** `unzip toyosnap-v*.zip -d toyosnap`

> Do not delete or move the folder after loading — Chrome loads from it directly.

### 3. Open Chrome Extensions

Navigate to `chrome://extensions` in your Chrome address bar.

### 4. Enable Developer mode

Toggle **Developer mode** in the top-right corner of the Extensions page. You only need to do this once.

### 5. Load unpacked

Click **Load unpacked** and select the folder you unzipped in Step 2.

ToyoSnap will appear in your extensions list with the ID `ocaimfeebaaanidmmklncfdempaeijdf`.

### 6. Pin to toolbar (optional but recommended)

Click the puzzle-piece icon in the Chrome toolbar → click the pin icon next to ToyoSnap.

---

## Verify the install

Click the ToyoSnap icon. The popup should open showing:
- A mode selector (rrweb / Screenshot chain)
- A cursor toggle
- A **Start Recording** button
- A version string at the bottom (e.g. `v0.1.0 · abc1234`)

---

## Updating to a new version

1. Download the new zip from the Releases page
2. Unzip to a **new** folder (or overwrite the old one)
3. Go to `chrome://extensions` → find ToyoSnap → click the **reload** icon (circular arrow)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Manifest file is missing or unreadable" | Make sure you selected the unzipped folder, not the zip file itself |
| Extension ID doesn't match `ocaimfeebaaanidmmklncfdempaeijdf` | Re-download the official zip — don't build from source unless you know what you're doing |
| Popup is blank | Try `chrome://extensions` → disable → re-enable ToyoSnap |
| "This extension is not from the Chrome Web Store" banner | This is normal for developer-loaded extensions. Click **Keep** to dismiss. |

---

## Uninstalling

`chrome://extensions` → find ToyoSnap → click **Remove**.

Your recorded sessions are stored in IndexedDB and will be deleted when the extension is removed.
