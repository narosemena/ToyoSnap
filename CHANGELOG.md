# Changelog

All notable changes to ToyoSnap are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [0.1.0] — 2026-04-28

Initial beta release.

### Added
- **Core capture engine**: rrweb DOM replay recording + screenshot-per-step capture
- **9 export formats**: PNG chain, SVG chain, HTML Replay, Video (WebM), Action Log, Markdown, PPTX, DOCX, MCP JSON
- **Encryption at rest**: AES-GCM 256-bit encryption for all blobs and rrweb payloads in IndexedDB
- **PII controls**: two-level ledger (global + per-session) for blur and redact operations
- **Zero-Egress CSP**: `connect-src 'self'` enforced at the browser level
- **Push-resume + self-resume**: session survives SSO redirects and MV3 service worker sleeps
- **Design system extraction**: auto-extracts colors, typography, shadows, and anti-patterns from captured pages
- **Stable extension ID**: RSA key pair pinning via `manifest.key` (`ocaimfeebaaanidmmklncfdempaeijdf`)
- **Version surfacing**: build version + git SHA shown in popup footer for triage
- **Beta onboarding kit**: INSTALL, BETA-GUIDE, PRIVACY, SECURITY docs + demo form

### Known issues
- iframes (SSO login forms, embedded widgets) are not captured — `all_frames: false` is intentional
- `captureVisibleTab` requires the recorded tab to be in the foreground
- rrweb pinned to v1.1.3 stable; v2 upgrade deferred until GA
