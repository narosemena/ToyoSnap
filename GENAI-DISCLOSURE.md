# GenAI Disclosure

| Field | Value |
|---|---|
| Tool | Claude (Anthropic) |
| Use | Architecture planning and code generation assistance |
| Corporate Data Used | None |
| Intake Reference | [Add Corporate GenAI Intake ticket number post-submission] |
| Validation | See `tests/` directory and required PR review process |

## Scope of Use

Claude was used for:
- Architecture design and implementation planning
- Code scaffolding across all layers (types, security, storage, capture, export, UI, tests)

Claude was **not** used for:
- Processing any Corporate confidential information
- Accessing any Toyota internal systems, data, or credentials
- Generating or handling PII

## Validation Mechanism

All AI-generated code must be validated before merge:
1. Automated test suite (`npm test`) — security gates run first and block on failure
2. Mandatory human code review — no self-merge permitted; at least one human reviewer required per PR
3. `web-ext lint` manifest validation
4. SAST scan via `semgrep`

See `tests/security/` for the security test suite that validates AI-generated security-critical code.
