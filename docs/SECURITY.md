# Security Policy

## Scope

This security policy covers the ToyoSnap Chrome extension and this repository.

**In scope:**
- The extension itself (`dist/` build artifacts)
- Source code in this repository
- The release packaging and distribution pipeline

**Out of scope:**
- Third-party libraries bundled by ToyoSnap (report those to their maintainers)
- Chrome itself or the Chrome Extensions platform

---

## Reporting a vulnerability

If you find a security issue, please **do not open a public GitHub Issue**.

Report it privately via GitHub's [Security Advisories](../../security/advisories/new) feature (available from the Security tab of this repository).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your suggested fix (optional)

We will acknowledge receipt within 5 business days and aim to publish a fix within 30 days for critical issues.

---

## Security invariants

The following properties must hold in every release. If you find a violation, treat it as a security issue:

1. **Zero-Egress**: The extension must never make a network request to any external host. The CSP `connect-src 'self'` is the enforcement mechanism.
2. **No source maps shipped**: Production builds must not include `.map` files that expose internal structure.
3. **Password masking**: `rrweb` must always be initialized with `maskInputOptions: { password: true }`.
4. **No `tabCapture` permission**: The manifest must not include `tabCapture`.
5. **IDB encryption**: All blobs and rrweb event payloads must be AES-GCM 256-bit encrypted before storage.

---

## Extension ID

The official ToyoSnap extension ID is `ocaimfeebaaanidmmklncfdempaeijdf`. If you install an extension claiming to be ToyoSnap with a different ID, do not use it.
