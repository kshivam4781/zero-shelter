# Core Judgment Cases

| ID | Priority | Risk | Expected result | Execution | Evidence |
| --- | --- | --- | --- | --- | --- |
| BASE-01 | P1 | A valid npm report cannot reach judgment. | A valid npm audit report produces parsed, ranked findings without requiring OSV. | CI | `test/npm-audit.test.ts`, `test/pipeline.test.ts` |
| MERGE-01 | P0 | Duplicate advisories remain separate across sources. | Matching ecosystem, package, and alias sets become one finding with both sources retained. | CI | `test/pipeline.test.ts` |
| MERGE-02 | P0 | Different packages are collapsed because of malformed shared advisory data. | Findings from different packages never merge solely because an alias matches. | CI | `test/pipeline.test.ts` |
| MERGE-03 | P0 | A possible duplicate is hidden without identifier evidence. | Same-package findings without a shared alias remain separate and are surfaced as related. | CI | `test/pipeline.test.ts`, `test/merge-scale.test.ts` |
| RANK-01 | P1 | A critical, direct, fixable finding is not prioritized. | A critical direct dependency with a known fix ranks above lower-risk alternatives in the scenario. | CI | `test/pipeline.test.ts` |
| RANK-02 | P1 | Tie order changes between machines or input order. | Equal scores use a deterministic fingerprint tie-break. | CI | `test/pipeline.test.ts` |
| BASELINE-01 | P1 | Existing backlog is reported as newly introduced. | A recorded baseline suppresses accepted findings while retaining new findings. | CI | `test/pipeline.test.ts` |
| BASELINE-02 | P0 | A missing scanner source is interpreted as a fixed vulnerability. | A finding missing after one of its recorded sources is absent is reported as uncertain, not resolved. | CI | `test/no-longer-reported.test.ts` |
| BASELINE-03 | P0 | A damaged or incompatible baseline is silently ignored. | The command names the baseline error and produces no judgment. | CI | `test/pipeline.test.ts`, `test/nothing-scanned.test.ts` |
| BASELINE-04 | P1 | A baseline recorded from stored scanner input does not suppress the same re-run. | `--update-baseline` accepts every current merged finding, and the unchanged input then has no new work. | CI | `test/cli-inputs.test.ts` |
| TOP-01 | P1 | `--top` changes project risk counts or remediation advice. | `--top` limits only displayed findings; totals, reduction, and actions remain based on all findings. | CI | `test/top-is-display-only.test.ts` |
