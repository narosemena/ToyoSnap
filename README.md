# ToyoSnap

**Zero-Egress WorkflowCapture Engine** — a Chrome extension for instructional designers that records web-based workflows and exports them as video, image chains, interactive HTML/CSS, or layered SVGs.

**Zero-Egress** means all processing happens entirely on your machine. No screenshots, recordings, or workflow data are ever sent to a server.

---

## Install (beta)

See **[docs/INSTALL.md](docs/INSTALL.md)** for the full step-by-step walkthrough.

Short version:
1. Download the latest `toyosnap-v*.zip` from the [Releases page](../../releases)
2. Unzip it
3. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the unzipped folder
4. The ToyoSnap icon appears in your toolbar

Extension ID: `ocaimfeebaaanidmmklncfdempaeijdf`

---

## Beta program

- **[docs/BETA-GUIDE.md](docs/BETA-GUIDE.md)** — what to test, known issues, how to give feedback
- **[docs/PRIVACY.md](docs/PRIVACY.md)** — what data stays on your machine and why
- **[CHANGELOG.md](CHANGELOG.md)** — version history

---

## For developers

```bash
npm install
npm run build        # production build → dist/
npm run dev          # watch mode
npm run test         # full test suite (security → unit → e2e)
npm run package      # build + zip → web-ext-artifacts/
```

See [CLAUDE.md](CLAUDE.md) for architecture, security invariants, and contribution guidelines.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
