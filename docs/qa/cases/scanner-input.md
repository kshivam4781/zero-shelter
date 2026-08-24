# Scanner Input Cases

| ID | Priority | Risk | Expected result | Execution | Evidence |
| --- | --- | --- | --- | --- | --- |
| INPUT-01 | P1 | Current npm audit output is parsed incorrectly. | A current npm audit report preserves aliases, severity, directness, and available fix information. | CI | `test/npm-audit.test.ts` |
| INPUT-02 | P1 | A pnpm project is treated as an npm project and fails before parsing. | `pnpm-lock.yaml` selects `pnpm audit`, and its advisories format reaches the common parser. | CI | `test/npm-audit.test.ts`, `test/scan.test.ts` |
| INPUT-03 | P1 | Stored scanner reports behave differently from live scans. | Repeated `--input` files are detected by content and use the same judgment pipeline. | CI | `test/cli-inputs.test.ts`, `test/error-paths.test.ts` |
| INPUT-04 | P1 | The tool accepts its own SARIF output as scanner input. | A SARIF file is rejected with an explanation instead of producing a false judgment. | CI | `test/error-paths.test.ts` |
| ACQ-01 | P1 | Optional OSV absence blocks a valid npm scan. | npm findings are judged and the report states that OSV was skipped. | CI | `test/scan.test.ts` |
| ACQ-02 | P0 | Scanner failure or unreadable output is displayed as a clean scan. | Empty, unreadable, or failed scanner output is visible in diagnostics and not counted as a successful source. | CI | `test/scan.test.ts`, `test/nothing-scanned.test.ts` |
| ACQ-03 | P0 | A project that no scanner examined exits successfully. | No contributing scanner produces exit code 2 and says that nothing was scanned. | CI | `test/nothing-scanned.test.ts` |
| ACQ-04 | P2 | A yarn-lock project receives an inaccurate parser claim. | When no scanner reads `yarn.lock`, output explains the limitation and the supported next action. | CI | `test/lockfile-decides.test.ts` |
