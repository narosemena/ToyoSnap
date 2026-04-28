# Release Procedure

## Extension ID

The pinned Chrome extension ID is **`ocaimfeebaaanidmmklncfdempaeijdf`**.

This ID is derived from the RSA 2048-bit public key stored in `src/manifest.ts` as the `key` field. As long as that key does not change, the extension ID is stable across all load-unpacked installs and a future CWS upload.

---

## Key custody

| Asset | Location | Owners |
|---|---|---|
| Private key (`toyosnap-release.pem`) | 1Password vault — "ToyoSnap release key" | Release owner + backup (minimum 2) |
| Public key (base64 DER) | `src/manifest.ts` `key` field | Committed to repo — public, safe |

**Never commit the `.pem` file.** It is listed in `.gitignore`. If it is accidentally committed, rotate the key immediately (see below).

To verify the key is ignored:
```bash
git status toyosnap-release.pem   # should show "nothing to commit"
```

---

## Releasing a new version

### 1. Bump the version

Update the version in **both** of these files (they must match):
- `package.json` → `"version"` field
- `src/manifest.ts` → `version` field

```bash
# Example: bump to 0.2.0
sed -i 's/"version": "0.1.0"/"version": "0.2.0"/' package.json
# Edit src/manifest.ts manually
```

Commit the version bump:
```bash
git commit -am "chore: bump version to 0.2.0"
git push
```

### 2. Tag and push

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers the `.github/workflows/release.yml` workflow, which:
1. Runs typecheck + lint
2. Builds the extension
3. Asserts no source maps shipped
4. Generates `sbom.json` and `licenses.json`
5. Packages the zip via `web-ext build`
6. Computes `SHA256SUMS.txt`
7. Creates a **draft** GitHub Release with all four artifacts attached

### 3. Publish the release

Go to the GitHub Releases page, find the draft, add release notes (copy from `CHANGELOG.md`), and click **Publish release**.

### 4. Distribute

- **Internal testers:** post the GitHub Releases URL in `#toyosnap-beta` Slack
- **External testers:** send the GitHub Releases URL directly

Both groups follow the same install procedure: download zip → unzip → Load unpacked.

---

## Rotating the RSA key

Rotating the key changes the extension ID. Existing installs will stop updating from the new release and testers will need to reinstall. Do this only if the private key is compromised.

1. Generate a new key pair:
   ```bash
   openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out toyosnap-release-new.pem
   openssl rsa -in toyosnap-release-new.pem -pubout -outform DER | openssl base64 -A
   ```
2. Update `src/manifest.ts` `key` field with the new base64 public key
3. Compute and document the new extension ID:
   ```bash
   openssl rsa -in toyosnap-release-new.pem -pubout -outform DER | \
     openssl dgst -sha256 -binary | od -A n -t x1 | tr -d ' \n' | head -c 32 | tr '0-9a-f' 'a-p'
   ```
4. Update `README.md`, `docs/INSTALL.md`, and `docs/SECURITY.md` with the new ID
5. Store the new `.pem` in 1Password, delete the old entry
6. Notify all testers — they must reinstall from scratch

---

## Deferred: Chrome Web Store unlisted

When the corporate CWS developer account is available:

1. Upload the same zip from the release workflow to the CWS dashboard
2. Set the listing to **Unlisted** (private URL, not searchable in the Store)
3. Because `manifest.key` is already pinned, the CWS-assigned extension ID will match the current load-unpacked ID — testers' existing IDB sessions carry over seamlessly after migrating to CWS
4. Compliance gates that must clear before CWS submission:
   - Corporate GenAI Intake ticket (see `GENAI-DISCLOSURE.md`)
   - `dompurify` dual-license legal sign-off (Apache-2.0 / MPL-2.0)

Optional: automate CWS uploads via GitHub Actions using `mnao104/chrome-extension-upload@v5.0.0` with these secrets:
- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`
- `CWS_EXTENSION_ID`
