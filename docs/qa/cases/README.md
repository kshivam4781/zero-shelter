# QA Cases

This catalogue defines reusable, sanitized beta cases. A case is not a test result: it records the risk, expected behavior, execution mode, and evidence location. Dated execution results belong in [QA Reports](../reports/README.md).

## Case fields

| Field | Meaning |
| --- | --- |
| ID | Stable identifier used in reports, issues, and reviews. |
| Priority | P0 through P3, as defined in [Quality Gates](../quality-gates.md). |
| Risk | The user or security failure prevented by the case. |
| Expected result | One observable result that can be checked. |
| Execution | `CI`, `Change review`, `Release`, `Benchmark`, or `Manual`. |
| Evidence | Existing test path or the evidence required before release. |

## Case groups

| Group | Scope |
| --- | --- |
| [Core Judgment](core-judgment.md) | Alias merge, ranking, baseline, and `--top` |
| [Scanner Input](scanner-input.md) | npm, pnpm, OSV, stored reports, and scanner acquisition failures |
| [Action and Output](action-and-output.md) | Remediation, workspace context, text, JSON, SARIF, HTML, and hook output |
| [Determinism and Stress](determinism-and-stress.md) | Reordering, repeated runs, boundary behavior, and large findings sets |

## Catalogue rules

- Keep IDs stable after publication; retire an ID instead of reusing it.
- Add a case for a reusable risk, not every incidental implementation branch.
- Prefer CI evidence for deterministic behavior. Use manual evidence only where automation would be misleading or disproportionate.
- Do not place real secrets, private projects, or undisclosed vulnerability details in this catalogue.
