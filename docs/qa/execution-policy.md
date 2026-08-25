# QA Execution Policy

QA cases are stable contracts. They are not all manually repeated for every change. Their `Execution` value says when the required evidence must be collected.

## Execution modes

| Mode | When it runs | Required evidence |
| --- | --- | --- |
| CI | Every pull request and push to `main` | Automated test passes in the supported OS matrix. |
| Change review | A related parser, merge, ranking, baseline, report, or CLI behavior changes | Linked automated test plus any listed manual check. |
| Release | A beta candidate or npm package is prepared | Relevant P0/P1 cases, full build checks, and `npm run qa`. |
| Benchmark | Scanner versions, parser behavior, merge behavior, ranking weights, or frozen captures change | Reproducible benchmark output and limitation statement. |
| Manual | A user-facing behavior cannot be reliably automated | Dated report with command-independent observation. |

## What runs today

The CI workflow runs `npm ci`, `npm run typecheck`, and `npm test` on Ubuntu, macOS, and Windows. Therefore every case marked `CI` must have an automated test under `test/`; it runs on every pull request after it is added.

The release check adds `npm run build`, `npm pack --dry-run`, and `npm run qa`. The last command creates a tarball, installs that tarball in a temporary project, and checks the shipped CLI rather than the working copy.

## Adding a case

1. Assign a stable ID in the relevant case page.
2. State one observable expected result and the product risk it protects.
3. Assign P0 through P3 and an execution mode.
4. Link existing evidence or add the required test in the same change.
5. Use a dated report only for the outcome of an inspection, not as the only definition of expected behavior.

## Required beta cadence

| Event | Minimum work |
| --- | --- |
| Every code change | Run the local checks relevant to the change; CI runs the full automated suite. |
| Before merging a high-risk change | Review linked P0/P1 cases and record any manual evidence in the PR or issue. |
| Before a beta release | Run all relevant P0/P1 cases, `npm run qa`, and complete a dated short report. |
| After a confirmed defect | Add a regression test when feasible, re-run the case, and update the report. |
