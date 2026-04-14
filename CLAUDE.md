# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working on the ToyoSnap codebase.

---

## Project Overview

**ToyoSnap** is a project currently in its initial setup phase. The repository was initialized with an Apache 2.0 license and a minimal README. No application code, dependencies, or configuration exist yet.

- **License**: Apache 2.0 (see `LICENSE`)
- **Repository**: `narosemena/ToyoSnap`
- **Status**: Early-stage / pre-implementation

---

## Repository Structure

```
ToyoSnap/
├── .git/           # Git metadata
├── LICENSE         # Apache License 2.0
├── README.md       # Project title only
└── CLAUDE.md       # This file
```

As the project grows, this section should be updated to reflect the actual source layout, e.g.:

```
ToyoSnap/
├── src/            # Application source code
├── tests/          # Test suite
├── docs/           # Documentation
├── .github/        # CI/CD workflows and PR templates
├── package.json    # (or equivalent build manifest)
└── README.md
```

---

## Git Workflow

### Branches

| Branch pattern | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `claude/<task-slug>` | AI-generated feature/documentation branches |
| `feature/<description>` | Human-authored features |
| `fix/<description>` | Bug fixes |

The active development branch for Claude-assisted documentation work is:
`claude/add-claude-documentation-r0oAV`

### Commit Messages

Use concise, imperative-mood commit messages:

```
Add initial project scaffolding
Fix null pointer in snapshot loader
Update README with setup instructions
```

Avoid vague messages like "WIP", "misc changes", or "fix stuff".

### Pushing

Always use:
```bash
git push -u origin <branch-name>
```

Never force-push to `main`.

---

## Development Commands

> This section will be populated once the tech stack is chosen and build tooling is set up.

Expected commands to document here:
- **Install dependencies** — `npm install` / `pip install -r requirements.txt` / etc.
- **Run development server** — e.g. `npm run dev`
- **Build for production** — e.g. `npm run build`
- **Run tests** — e.g. `npm test` / `pytest`
- **Lint / format** — e.g. `npm run lint` / `black .`

---

## Testing

> No test suite exists yet. When tests are added, document:
> - Test framework used
> - How to run tests (`npm test`, `pytest`, etc.)
> - Location of test files
> - Coverage requirements or CI gates

---

## Code Conventions

> Conventions will depend on the chosen stack. When defined, document:
> - Language version requirements
> - Formatting rules (indentation, line length, quotes)
> - Linting configuration
> - Naming conventions (files, functions, variables, components)
> - Import ordering

---

## Environment & Configuration

> No environment variables or config files exist yet. When added, document:
> - Required environment variables and their purpose
> - `.env.example` format
> - Secrets management approach (never commit secrets)

---

## CI/CD

> No CI/CD pipelines configured yet. When set up, document:
> - Pipeline provider (GitHub Actions, etc.)
> - Workflows and what triggers them
> - Required checks before merging

---

## AI Assistant Notes

- This repository is a blank slate — propose architecture and tech-stack decisions to the user before implementing code.
- Keep changes scoped to the task; do not add unrequested features or refactors.
- Always read a file before editing it.
- Do not commit secrets, credentials, or `.env` files.
- Update this `CLAUDE.md` whenever the project structure, workflows, or conventions change materially.
- When creating new top-level directories or configuration files, add them to the Repository Structure section above.
