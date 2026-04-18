#!/bin/bash
# Run from repo root on a tagged commit
set -euo pipefail

TAG=$(git describe --tags --exact-match)
OUT="audit-evidence-${TAG}"
mkdir -p "$OUT"

# Regenerate everything from scratch
npm ci
npm run typecheck 2>&1 | tee "$OUT/typecheck.log"
npm run lint 2>&1 | tee "$OUT/lint.log"
npm run lint:sast 2>&1 | tee "$OUT/sast.log"
npm run build
npm run lint:manifest 2>&1 | tee "$OUT/manifest-lint.log"
npm run licenses && cp licenses.json "$OUT/"
npm run sbom && cp sbom.json "$OUT/"
npm run test:security 2>&1 | tee "$OUT/test-security.log"
npm run test:unit -- --coverage 2>&1 | tee "$OUT/test-unit.log"
cp -r coverage "$OUT/coverage"
npm run test:a11y 2>&1 | tee "$OUT/test-a11y.log"
xvfb-run --auto-servernum npm run test:e2e 2>&1 | tee "$OUT/test-e2e.log"
npm run test:contract 2>&1 | tee "$OUT/test-contract.log"
npm run test:fuzz 2>&1 | tee "$OUT/test-fuzz.log"

# Current docs snapshot
cp CLAUDE.md "$OUT/"
cp GENAI-DISCLOSURE.md "$OUT/"
cp -r docs "$OUT/docs"

# Zip it
zip -r "audit-evidence-${TAG}.zip" "$OUT"
echo "Done: audit-evidence-${TAG}.zip"
