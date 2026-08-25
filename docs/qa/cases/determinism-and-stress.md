# Determinism and Stress Cases

| ID | Priority | Risk | Expected result | Execution | Evidence |
| --- | --- | --- | --- | --- | --- |
| DET-01 | P0 | Equivalent text differs across platforms. | BOM, Unicode normalization, and line endings produce the same normalized identity. | CI | `test/determinism.test.ts` |
| DET-02 | P0 | Input or alias ordering changes the merged result. | Reordered reports and aliases produce the same aliases, fingerprints, merge result, and ranking. | CI | `test/npm-audit.test.ts`, `test/pipeline.test.ts` |
| DET-03 | P1 | The same HTML judgment renders differently on repeat. | Repeated HTML rendering for the same judgment is byte-identical unless an explicit stamp is supplied. | CI + Release | `test/html.test.ts`, `scripts/qa-install.mjs` |
| DET-04 | P0 | CLI input order changes a stored-report judgment. | The same npm and OSV reports in either `--input` order produce byte-equivalent JSON. | CI | `test/cli-inputs.test.ts` |
| BOUNDARY-01 | P1 | An empty successful report is confused with an unreadable report. | The output distinguishes zero findings from no readable scanner result. | CI | `test/npm-audit.test.ts`, `test/nothing-scanned.test.ts` |
| STRESS-01 | P2 | Large reports make suspected-duplicate analysis unusable. | A synthetic 7,500-finding set completes within the test budget without changing relation semantics. | CI + Benchmark | `test/merge-scale.test.ts` |
