# ToyoSnap Beta Tester Scripts

Welcome to the ToyoSnap beta program. Choose the script that matches your role. Each script is self-contained; you don't need to read the others.

## Before you start — everyone reads this first

**[PREREQUISITES.md](PREREQUISITES.md)** — Install the extension, open the prescribed test page, and record your build info. Estimated time: 5 min. Do not skip this.

## Choose your script

| My role | Script | Estimated time |
|---|---|---|
| Internal QA engineer | [ROLE-QA.md](ROLE-QA.md) | ~75 min |
| Instructional designer (the product's target user) | [ROLE-DESIGNER.md](ROLE-DESIGNER.md) | ~40 min |
| Compliance / InfoSec reviewer | [ROLE-COMPLIANCE.md](ROLE-COMPLIANCE.md) | ~30 min |

## How to file your results

1. Copy the blank table from [RESULTS-TEMPLATE.md](RESULTS-TEMPLATE.md).
2. Fill in Pass/Fail, severity, and notes for each step you run.
3. Open a GitHub Issue using the **Beta Feedback** template in this repo.
4. Paste your completed results table into the "Additional context" field.

## Prescribed test page

All scripts record against the same page so bugs are reproducible:

```
https://narosemena.github.io/ToyoSnap/demo-form.html
```

If you cannot reach that URL (e.g., behind a strict outbound filter), use the local copy shipped in the release zip:

```
<unzipped-release>/test-pages/demo-form.html   ← open via File > Open File in Chrome
```

This is a fictional Acme Corp expense form. No real data is ever involved.
