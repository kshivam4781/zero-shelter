# Agent contribution rules

This repository accepts agent-assisted contributions. These rules are the
repository-local contract for coding agents; the human contributor remains
responsible for the scope, correctness, and final review.

## Before editing

1. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`GOVERNANCE.md`](./GOVERNANCE.md),
   [`SECURITY.md`](./SECURITY.md), and the linked Issue or feature spec.
2. Inspect the working tree and preserve changes that were already present.
3. State the smallest set of files needed for the Issue before making edits.

## Scope rules

- Change only what the linked Issue or spec requires. Do not add an unrelated
  refactor, formatting pass, dependency update, or cleanup.
- Treat judgement and published interfaces as protected contracts:
  `src/judge.ts`, `src/merge.ts`, `src/triage.ts`, `src/fingerprint.ts`,
  `src/baseline.ts`, `src/cli.ts`, `src/report.ts`, `src/sarif.ts`,
  `src/hook.ts`, `package.json`, `package-lock.json`, `.github/`, and
  `skills/`. Changes to these paths need explicit scope and the review required
  by the governance rules.
- Do not change ranking weights, fingerprints, baseline semantics, exit codes,
  output schemas, or hook behavior to make a test or report look better.
- Do not run `npm audit fix`, update a lockfile, use `--update-baseline`, or
  regenerate snapshots, fixtures, captures, or benchmark labels unless the
  Issue explicitly calls for that change and the reason is recorded.

## Stop and ask a human

Pause when the work crosses the Issue scope, changes a shared contract, adds a
runtime dependency or network/LLM/telemetry behavior, handles secrets or
personal data, changes release/publish behavior, or conflicts with another
working tree. Do not guess an Owner's decision.

Never commit real secrets, personal data, internal URLs, or undisclosed
vulnerability details. Never reset, clean, or overwrite another contributor's
changes to make the tree convenient.

## Required validation

Run the checks relevant to the change and record their results:

```bash
npm test
npm run typecheck
npm run build
npm run qa             # when the repository version provides this script
git diff --check
```

For package or CLI changes, also inspect `npm pack --dry-run` and run the
published-package smoke path. Review every changed file and report anything
that was not verified. Update the English canonical documentation and its
Korean translation when user-visible behavior changes.
