# Install and first-run experience

Owner: @PresentJay. This is the spec and QA bar for one area — getting the tool
onto a machine and through its first run — so the other two areas can be worked
on without guessing where the seams are.

## Boundary

| Area | Covers | Not this area |
|---|---|---|
| **Install UX** (this doc) | how it is installed, what the first run does, what it says when it cannot do its job, version and help output, supported Node versions | how good the judgement is, how the report reads once it works |
| Output quality | ranking, wording of findings, what deserves to be in "fix now" | how you got here |
| Contributing | CONTRIBUTING, issue and PR templates, what a newcomer does first | end-user install |

Where they touch: the first-run message when there is nothing to scan is
install UX; the wording of an actual finding is output quality.

## Supported install paths

| Path | Command | Status |
|---|---|---|
| No install | `npx zero-shelter judge` | works — `zero-shelter@0.0.1` is on npm |
| Dev dependency | `npm i -D zero-shelter` then `npx zero-shelter judge` | to verify |
| From source | `git clone … && npm ci && npm run build && npm run judge` | works |

Node 20 or later. No runtime dependencies, 47.5 kB packed.

## What the first run must never do

**Report success when it checked nothing.** Today it does:

```console
$ cd /tmp/empty-dir && npx zero-shelter judge
  npm audit output unreadable: npm audit output has neither `vulnerabilities` …
  osv-scanner skipped: not on PATH (optional …)

✓ nothing new to fix          # exit 0
```

There is no lockfile here, so nothing was scanned. "nothing new to fix" and a
zero exit code say the opposite. In CI this is worse than a crash: the pipeline
goes green on a project the tool never looked at.

## QA checklist

The bar for this area. Every line is a command someone else can run.

| # | Case | Expected | Now |
|---|---|---|---|
| 1 | No lockfile in the directory | Says a lockfile is required and how to get one. Exit 2 (cannot judge), never 0 | ❌ says "nothing new to fix", exit 0 |
| 2 | `--version` | Prints the version | ❌ errors, then prints help |
| 3 | Node older than 20 | Says which version is required and which is running | ⚠️ npm warns on install; running it is untested |
| 4 | `osv-scanner` absent | Runs to completion on npm audit alone, one quiet note | ✅ |
| 5 | `--help` | Covers `judge` and `hook`, every flag, exit codes | ✅ |
| 6 | Windows, macOS, Linux | Identical output | ✅ 3-OS CI |
| 7 | Install footprint | No runtime dependencies; only `dist`, README, LICENSE shipped | ✅ 49 files, 47.5 kB |
| 8 | Scanner message accuracy | Names formats we actually parse | ❌ still mentions yarn v1, which we do not read |
| 9 | `npx zero-shelter` with no subcommand | Same as `judge` | ✅ |
| 10 | Second run after `--update-baseline` | `✓ nothing new to fix`, exit 0 — the honest one | ✅ |

## Definition of done — 2026-08-25 24:00

All ten green, verified on a clean machine state (`npx --yes zero-shelter@latest`
against a throwaway project, not a working copy), and the result posted as a QA
report in Discussions.

Exit codes, which CI depends on and therefore cannot change casually:

| Code | Meaning |
|---|---|
| 0 | Nothing new to fix |
| 1 | New findings to fix |
| 2 | Could not judge — bad flags, unreadable input, nothing to scan |

## Not in this area, on purpose

- An `init` command that writes CI workflow and hook config. Convenience, not
  correctness; it can wait until after the deadline.
- Publishing under an npm organisation. Ownership, not install experience.
- Any change to what gets ranked or how it is worded.
